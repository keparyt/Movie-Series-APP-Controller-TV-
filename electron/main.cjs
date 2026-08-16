const { app, BrowserWindow, session, shell } = require('electron');
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
