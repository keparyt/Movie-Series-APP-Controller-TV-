const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');

const isDev = !app.isPackaged;
let mainWindow;
let cursorWorker = null;

function allowedAppNavigation(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    return isDev && parsed.hostname === '127.0.0.1' && parsed.port === '5173';
  } catch { return false; }
}

function allowedFrameNavigation(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (isDev && parsed.hostname === '127.0.0.1' && parsed.port === '5173') return true;
    if (parsed.hostname === 'vidking.net' || parsed.hostname.endsWith('.vidking.net')) return true;
    if (parsed.hostname === 'tmdb.org' || parsed.hostname.endsWith('.tmdb.org')) return true;
    return false;
  } catch { return false; }
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
    if ($parts[0] -eq 'M' -and $parts.Count -ge 3) { [NativeMouse]::SetCursorPos([int]$parts[1], [int]$parts[2]) | Out-Null }
    elseif ($parts[0] -eq 'C') { [NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero); [NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero) }
  } catch {}
}
`;
  cursorWorker = spawn('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script], { windowsHide:true, stdio:['pipe','ignore','ignore'] });
  cursorWorker.on('exit',()=>{cursorWorker=null});
  cursorWorker.on('error',()=>{cursorWorker=null});
}
function stopCursorWorker(){
  if(cursorWorker){try{cursorWorker.stdin.end()}catch{} try{cursorWorker.kill()}catch{} cursorWorker=null;}
}
function writeCursorCommand(command){
  if(process.platform!=='win32') return false;
  startCursorWorker();
  if(!cursorWorker?.stdin?.writable) return false;
  try{cursorWorker.stdin.write(`${command}\n`);return true}catch{return false}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:1440,height:900,minWidth:960,minHeight:600,
    backgroundColor:'#050608',autoHideMenuBar:true,fullscreen:true,fullscreenable:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  });

  // Never allow links to create a normal browser window.
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));

  // The top-level Electron application may only stay on its own UI.
  // VidKing/TMDB are allowed only as embedded frames, never as the app's main page.
  mainWindow.webContents.on('will-navigate',(event,url)=>{
    if(!allowedAppNavigation(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-frame-navigate',(event,url,isMainFrame)=>{
    if(isMainFrame){
      if(!allowedAppNavigation(url)) event.preventDefault();
    } else if(!allowedFrameNavigation(url)) {
      event.preventDefault();
    }
  });

  if(isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname,'..','dist','index.html'));
  mainWindow.once('ready-to-show',()=>{mainWindow.setFullScreen(true);mainWindow.focus();resetControllerMouse();});
}

function resetControllerMouse(){
  if(!mainWindow||mainWindow.isDestroyed()) return;
  const bounds=mainWindow.getContentBounds();
  mainWindow.__controllerMouse={
    x:Math.round(bounds.x+bounds.width/2),
    y:Math.round(bounds.y+bounds.height/2)
  };
}

ipcMain.handle('enter-fullscreen',()=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.setFullScreen(true);mainWindow.focus();resetControllerMouse();}});
ipcMain.handle('exit-fullscreen',()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.setFullScreen(false)});
ipcMain.handle('quit-app',()=>{app.quit();return true});
ipcMain.handle('controller-key',(_event,key)=>{
  const allowedKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Space','Escape','KeyF','KeyM','PageUp','PageDown']);
  if(!allowedKeys.has(key)||!mainWindow||mainWindow.isDestroyed()) return false;
  try{
    mainWindow.focus();
    mainWindow.webContents.focus();
    mainWindow.webContents.sendInputEvent({type:'keyDown',keyCode:key});
    mainWindow.webContents.sendInputEvent({type:'keyUp',keyCode:key});
    return true;
  }catch{return false}
});

ipcMain.handle('controller-mouse-move',(_event,payload)=>{
  if(!mainWindow||mainWindow.isDestroyed()) return false;
  const dx=Number(payload?.dx),dy=Number(payload?.dy);
  if(!Number.isFinite(dx)||!Number.isFinite(dy)) return false;
  const bounds=mainWindow.getContentBounds();
  if(!Number.isFinite(bounds.width)||!Number.isFinite(bounds.height)||bounds.width<=0||bounds.height<=0) return false;
  if(!mainWindow.__controllerMouse) resetControllerMouse();

  // Keep the synthetic Windows cursor strictly inside this Electron window.
  // This prevents controller mouse movement from ever reaching another app/browser.
  const minX=Math.round(bounds.x);
  const minY=Math.round(bounds.y);
  const maxX=Math.round(bounds.x+bounds.width-1);
  const maxY=Math.round(bounds.y+bounds.height-1);
  mainWindow.__controllerMouse.x=Math.max(minX,Math.min(maxX,mainWindow.__controllerMouse.x+dx));
  mainWindow.__controllerMouse.y=Math.max(minY,Math.min(maxY,mainWindow.__controllerMouse.y+dy));
  mainWindow.focus();
  return writeCursorCommand(`M ${Math.round(mainWindow.__controllerMouse.x)} ${Math.round(mainWindow.__controllerMouse.y)}`);
});

ipcMain.handle('controller-mouse-click',()=>{
  if(!mainWindow||mainWindow.isDestroyed()) return false;
  mainWindow.focus();
  mainWindow.webContents.focus();
  return writeCursorCommand('C');
});

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeSendHeaders((details,callback)=>callback({requestHeaders:details.requestHeaders}));
  createWindow();
  startCursorWorker();
  app.on('activate',()=>{
    if(BrowserWindow.getAllWindows().length===0) createWindow();
    else {mainWindow.setFullScreen(true);mainWindow.focus();mainWindow.webContents.focus();resetControllerMouse();}
  });
});
app.on('before-quit',stopCursorWorker);
app.on('window-all-closed',()=>{stopCursorWorker();if(process.platform!=='darwin')app.quit()});
