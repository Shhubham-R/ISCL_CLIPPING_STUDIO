const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// Hardware acceleration configuration
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,D3D11VideoDecoder,PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 5050;

// Application Data Directory for Project Database
const APP_DATA_DIR = path.join(app.getPath('userData'), 'iscl_database');
const PROJECTS_FILE = path.join(APP_DATA_DIR, 'projects.json');
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ activeProjectId: 'proj_default', projects: [] }, null, 2));
}

function startBackendServer() {
  const serverScript = path.join(__dirname, '..', 'server', 'index.js');
  const localNode = path.join(__dirname, '..', 'bin', 'node.exe');
  const nodeExec = fs.existsSync(localNode) ? localNode : 'node';
  console.log('[Electron] Starting background server process:', serverScript, 'using:', nodeExec);

  backendProcess = spawn(nodeExec, [serverScript], {
    cwd: path.join(__dirname, '..', 'server'),
    env: { ...process.env, PORT: BACKEND_PORT },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('[Electron] Failed to start backend process:', err);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`[Electron] Backend process exited with code ${code}, signal ${signal}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    title: 'ISCL CLIP STUDIO - Professional Live Cricket Video Capture & Clip Production',
    icon: path.join(__dirname, '..', 'server', 'public', 'logos', 'iscl_logo.png'),
    backgroundColor: '#0c0e14',
    frame: true, // Use standard OS frame or custom titlebar
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows streaming local HTTP 206 video feeds seamlessly
      backgroundThrottling: false
    }
  });

  // Load URL with retry to wait for backend
  const targetUrl = `http://localhost:${BACKEND_PORT}`;
  let attempts = 0;
  const maxAttempts = 15;

  function loadApp() {
    attempts++;
    mainWindow.loadURL(targetUrl).catch(() => {
      if (attempts < maxAttempts) {
        setTimeout(loadApp, 800);
      } else {
        console.error('[Electron] Failed to connect to backend after multiple attempts');
      }
    });
  }

  // Small delay to let Express start
  setTimeout(loadApp, 1000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Native Open Video Dialog
ipcMain.handle('dialog-open-video', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Master Cricket Video Feed',
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'ts', 'webm'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return null;

  const sourceFilePath = result.filePaths[0];
  const filename = path.basename(sourceFilePath);
  
  // Copy or symlink to server media directory so HTTP 206 streaming engine can serve it
  const mediaDir = path.join(__dirname, '..', 'server', 'public', 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  
  const destPath = path.join(mediaDir, filename);
  try {
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourceFilePath, destPath);
    }
    const stats = fs.statSync(destPath);
    return {
      success: true,
      filename,
      originalPath: sourceFilePath,
      streamUrl: `/api/media/stream/${filename}`,
      sizeMb: (stats.size / (1024 * 1024)).toFixed(2)
    };
  } catch (err) {
    return { error: err.message };
  }
});

// Native Open Logo Dialog
ipcMain.handle('dialog-open-logo', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Team / Sponsor Logo (Transparent PNG recommended)',
    properties: ['openFile'],
    filters: [
      { name: 'Image Assets', extensions: ['png', 'svg', 'webp', 'jpg', 'jpeg'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return null;

  const logoFilePath = result.filePaths[0];
  const filename = path.basename(logoFilePath);
  const logosDir = path.join(__dirname, '..', 'server', 'public', 'logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  const destPath = path.join(logosDir, filename);
  try {
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(logoFilePath, destPath);
    }
    return {
      success: true,
      id: filename,
      filename,
      name: filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, '').toUpperCase(),
      url: `/logos/${filename}`
    };
  } catch (err) {
    return { error: err.message };
  }
});

// Shell reveal in folder
ipcMain.handle('shell-show-item', async (event, relativeOrFullPath) => {
  let fullPath = relativeOrFullPath;
  if (relativeOrFullPath.startsWith('/exports/')) {
    fullPath = path.join(__dirname, '..', 'server', 'public', 'exports', path.basename(relativeOrFullPath));
  } else if (relativeOrFullPath.startsWith('/screenshots/')) {
    fullPath = path.join(__dirname, '..', 'server', 'public', 'screenshots', path.basename(relativeOrFullPath));
  }

  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
    return { success: true };
  }
  return { error: 'File not found on disk' };
});

// Local Project Database Persistence
ipcMain.handle('db-save-project', async (event, projectData) => {
  try {
    let db = { activeProjectId: projectData.id, projects: [] };
    if (fs.existsSync(PROJECTS_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      } catch (e) {}
    }
    const idx = db.projects.findIndex(p => p.id === projectData.id);
    if (idx >= 0) {
      db.projects[idx] = projectData;
    } else {
      db.projects.push(projectData);
    }
    db.activeProjectId = projectData.id;
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(db, null, 2));
    return { success: true, savedAt: new Date().toISOString() };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('db-load-project', async () => {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const db = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      const active = db.projects.find(p => p.id === db.activeProjectId) || db.projects[0] || null;
      return { success: true, project: active, allProjects: db.projects };
    }
    return { success: false, project: null };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('db-list-projects', async () => {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const db = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      return { success: true, projects: db.projects || [] };
    }
    return { success: true, projects: [] };
  } catch (err) {
    return { error: err.message };
  }
});

// App Lifecycle
app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
  }
});
