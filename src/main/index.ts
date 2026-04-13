import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow } from 'electron';

import { registerIpcHandlers } from './ipc/register-ipc.js';

let mainWindow: BrowserWindow | null = null;
const currentDir = path.dirname(fileURLToPath(import.meta.url));

const createMainWindow = () => {
  // app.getAppPath() 在打包(asar)和未打包模式下均能正确返回应用根目录
  const appRoot = app.getAppPath();

  const preloadPath = app.isPackaged
    ? path.join(appRoot, 'dist-electron', 'src', 'preload', 'index.js')
    : path.join(currentDir, '../preload/index.js');

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#f3efe4',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  registerIpcHandlers(() => mainWindow);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    // 仅开发模式下打开 DevTools，打包后绝不弹出
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const rendererPath = app.isPackaged
      ? path.join(appRoot, 'dist', 'index.html')
      : path.join(currentDir, '../../dist/index.html');
    void mainWindow.loadFile(rendererPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
