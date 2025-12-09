const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow;

// Detect OS for platform-specific behavior
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window with glass morphism effects
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1024,
    minHeight: 768,
    frame: false, // Frameless window for custom design
    transparent: true, // Enable transparency for glass effect
    backgroundColor: '#00000000', // Transparent background
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      webSecurity: true
    },
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    vibrancy: isMac ? 'under-window' : undefined, // macOS vibrancy effect
    backgroundMaterial: isWindows ? 'acrylic' : undefined, // Windows 11 acrylic effect
    show: false // Don't show until ready
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Apply OS-specific class for styling
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.add('electron-app');
      document.documentElement.classList.add('os-${process.platform}');
      
      // Add platform-specific class to body
      if ('${isMac}' === 'true') {
        document.body.classList.add('os-macos');
      } else if ('${isWindows}' === 'true') {
        document.body.classList.add('os-windows');
      } else if ('${isLinux}' === 'true') {
        document.body.classList.add('os-linux');
      }
    `);
  });

  // Handle window state changes
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.add('fullscreen');
    `);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.remove('fullscreen');
    `);
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.add('maximized');
    `);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.executeJavaScript(`
      document.documentElement.classList.remove('maximized');
    `);
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

// Handle IPC messages from renderer process
const { ipcMain } = require('electron');

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

ipcMain.on('window-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// Get window state
ipcMain.handle('get-window-state', () => {
  if (!mainWindow) return {};
  return {
    isMaximized: mainWindow.isMaximized(),
    isFullScreen: mainWindow.isFullScreen(),
    isMinimized: mainWindow.isMinimized()
  };
});
