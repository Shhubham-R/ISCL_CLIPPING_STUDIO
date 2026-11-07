const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Native File Dialogs
  openVideoFile: () => ipcRenderer.invoke('dialog-open-video'),
  openLogoFile: () => ipcRenderer.invoke('dialog-open-logo'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog-save-file', defaultName),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell-show-item', filePath),
  
  // Database / Project Persistence
  saveProjectFile: (projectData) => ipcRenderer.invoke('db-save-project', projectData),
  loadProjectFile: () => ipcRenderer.invoke('db-load-project'),
  listProjects: () => ipcRenderer.invoke('db-list-projects'),
  
  // System Telemetry
  getSystemInfo: () => ipcRenderer.invoke('system-info')
});
