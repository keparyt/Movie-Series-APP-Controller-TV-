const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
  isElectron: true,
  platform: process.platform,
  enterFullscreen: () => ipcRenderer.invoke('enter-fullscreen'),
  exitFullscreen: () => ipcRenderer.invoke('exit-fullscreen'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  sendControllerKey: (key) => ipcRenderer.invoke('controller-key', key),
  moveControllerMouse: (dx, dy) => ipcRenderer.invoke('controller-mouse-move', { dx, dy }),
  clickControllerMouse: () => ipcRenderer.invoke('controller-mouse-click')
}));
