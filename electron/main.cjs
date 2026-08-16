const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;
let mainWindow;

function allowedNavigation(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (isDev && parsed.hostname === '127.0.0.1' && parsed.port === '5173') return true;
    if (parsed.hostname.endsWith('vidking.net')) return true;
    if (parsed.hostname.endsWith('tmdb.org')) return true;
    return false;
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.vidking.net/')) return { action: 'allow' };
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!allowedNavigation(url)) event.preventDefault();
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
      x: Math.round(bounds.width / 2),
      y: Math.round(bounds.height / 2)
    };
  }

  mainWindow.__controllerMouse.x = Math.max(0, Math.min(bounds.width - 1, mainWindow.__controllerMouse.x + dx));
  mainWindow.__controllerMouse.y = Math.max(0, Math.min(bounds.height - 1, mainWindow.__controllerMouse.y + dy));

  try {
    mainWindow.webContents.sendInputEvent({
      type: 'mouseMove',
      x: Math.round(mainWindow.__controllerMouse.x),
      y: Math.round(mainWindow.__controllerMouse.y)
    });
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('controller-mouse-click', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try {
    mainWindow.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1 });
    mainWindow.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1 });
    return true;
  } catch {
    return false;
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => callback({ requestHeaders: details.requestHeaders }));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.setFullScreen(true);
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
