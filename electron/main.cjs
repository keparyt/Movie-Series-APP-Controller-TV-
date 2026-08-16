const { app, BrowserWindow, session, ipcMain, screen } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');

const isDev = !app.isPackaged;
let mainWindow;
let cursorWorker = null;

function allowedNavigation(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (isDev && parsed.hostname === '127.0.0.1' && parsed.port === '5173') return true;
    if (parsed.hostname === 'vidking.net' || parsed.hostname.endsWith('.vidking.net')) return true;
    if (parsed.hostname === 'tmdb.org' || parsed.hostname.endsWith('.tmdb.org')) return true;
    return false;
  } catch {
    return false;
  }
}

function startCursorWorker() {
  if (process.platform !== 'win32' || cursorWorker) return;

  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NativeMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    $parts = $line.Trim().Split(' ')
    if ($parts[0] -eq 'M' -and $parts.Count -ge 3) {
      [NativeMouse]::SetCursorPos([int]$parts[1], [int]$parts[2]) | Out-Null
    } elseif ($parts[0] -eq 'C') {
      [NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
      [NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
    }
  } catch {}
}
`;

  cursorWorker = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });

  cursorWorker.on('exit', () => { cursorWorker = null; });
  cursorWorker.on('error', () => { cursorWorker = null; });
}

function stopCursorWorker() {
  if (cursorWorker) {
    try { cursorWorker.stdin.end(); } catch {}
    try { cursorWorker.kill(); } catch {}
    cursorWorker = null;
  }
}

function writeCursorCommand(command) {
  if (process.platform !== 'win32') return false;
  startCursorWorker();
  if (!cursorWorker?.stdin?.writable) return false;
  try {
    cursorWorker.stdin.write(`${command}\n`);
    return true;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#050608',
    autoHideMenuBar: true,
    fullscreen: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  // NEVER hand links from the renderer/player to the operating system browser.
  // This is intentionally deny-all: the media player must remain inside Electron.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Keep top-level navigation inside the application only.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!allowedNavigation(url)) {
      event.preventDefault();
    }
  });

  // Also prevent attempts to create/navigate a separate frame to an arbitrary
  // external page. VidKing's own allowed frames are left untouched.
  mainWindow.webContents.on('will-frame-navigate', (event, url, isMainFrame) => {
    if (isMainFrame && !allowedNavigation(url)) {
      event.preventDefault();
    }
  });

  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.setFullScreen(true);
    mainWindow.focus();
  });
}

ipcMain.handle('enter-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(true);
    mainWindow.focus();
  }
});

ipcMain.handle('exit-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setFullScreen(false);
});

ipcMain.handle('controller-key', (_event, key) => {
  const allowedKeys = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Enter', 'Space', 'Escape', 'KeyF', 'KeyM', 'PageUp', 'PageDown'
  ]);
  if (!allowedKeys.has(key)) return false;
  if (!mainWindow || mainWindow.isDestroyed()) return false;

  try {
    mainWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
    mainWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('controller-mouse-move', (_event, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const dx = Number(payload?.dx);
  const dy = Number(payload?.dy);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;

  const bounds = mainWindow.getContentBounds();
  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return false;

  if (!mainWindow.__controllerMouse) {
    mainWindow.__controllerMouse = {
      x: Math.round(bounds.x + bounds.width / 2),
      y: Math.round(bounds.y + bounds.height / 2)
    };
  }

  const display = screen.getDisplayNearestPoint({
    x: mainWindow.__controllerMouse.x,
    y: mainWindow.__controllerMouse.y
  });
  const work = display.bounds;
  mainWindow.__controllerMouse.x = Math.max(work.x, Math.min(work.x + work.width - 1, mainWindow.__controllerMouse.x + dx));
  mainWindow.__controllerMouse.y = Math.max(work.y, Math.min(work.y + work.height - 1, mainWindow.__controllerMouse.y + dy));

  return writeCursorCommand(`M ${Math.round(mainWindow.__controllerMouse.x)} ${Math.round(mainWindow.__controllerMouse.y)}`);
});

ipcMain.handle('controller-mouse-click', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return writeCursorCommand('C');
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => callback({ requestHeaders: details.requestHeaders }));
  createWindow();
  startCursorWorker();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.setFullScreen(true);
  });
});

app.on('before-quit', stopCursorWorker);
app.on('window-all-closed', () => { stopCursorWorker(); if (process.platform !== 'darwin') app.quit(); });
