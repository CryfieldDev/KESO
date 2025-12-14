const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// =======================================================
// 🔴 FORZAR UTF-8 A NIVEL DE APLICACIÓN (CRÍTICO)
// =======================================================
process.env.LANG = 'es_ES.UTF-8';
process.env.LC_ALL = 'es_ES.UTF-8';
app.commandLine.appendSwitch('lang', 'es-ES');

// ==========================================
// 1. CLASE APP UPDATER
// ==========================================
class AppUpdater {
  constructor() {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    autoUpdater.verifyUpdateCodeSignature = false; 
    this.setupListeners();

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 1500);
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 [Updater] Verificando versiones...');
      if (mainWindow) mainWindow.webContents.send('checking_for_update');
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ [Updater] Todo al día.');
      if (mainWindow) mainWindow.webContents.send('update_not_available');
    });

    autoUpdater.on('update-available', (info) => {
      console.log(`⬇️ [Updater] Encontrada v${info.version}`);
      if (mainWindow) mainWindow.webContents.send('update_available');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) mainWindow.webContents.send('update_progress', progressObj.percent);
    });

    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) mainWindow.webContents.send('update_downloaded');
      setTimeout(() => {
        autoUpdater.quitAndInstall(); 
      }, 3000);
    });

    autoUpdater.on('error', (err) => {
      console.log("⚠️ [Updater] Error:", err);
      if (mainWindow) mainWindow.webContents.send('update_error', err.message);
    });
  }
}

// ==========================================
// 2. SERVIDOR BACKEND
// ==========================================
require('./server.js'); 

// ==========================================
// 3. GESTIÓN DE VENTANAS
// ==========================================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "KESO - Sistema de Inventario",
        icon: path.join(__dirname, 'img/keso.png'),
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,

            // 🔴 CLAVE ABSOLUTA PARA EMOJIS
            defaultEncoding: 'UTF-8'
        }
    });

    // =======================================================
    // ABRIR ENLACES EXTERNOS (WhatsApp, navegador, etc.)
    // =======================================================
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.loadURL('http://localhost:3000');
    mainWindow.maximize();
    mainWindow.show();

    new AppUpdater();
}

// ==========================================
// 4. EVENTO RE-CHEQUEO MANUAL
// ==========================================
ipcMain.on('manual-check-update', () => {
    console.log('🔄 [Main] Re-chequeo manual solicitado.');
    autoUpdater.checkForUpdatesAndNotify();
});

// ==========================================
// 5. CICLO DE VIDA
// ==========================================
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
