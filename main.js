const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

class AppUpdater {
  constructor() {
    // Configuración Base
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }
    autoUpdater.verifyUpdateCodeSignature = false; 

    // Listeners
    this.setupListeners();

    // Esperamos un poco para asegurar que la ventana cargó y puede escuchar
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 1500);
  }

  setupListeners() {
    // 1. AVISAR QUE EMPEZÓ A BUSCAR (Para bloquear UI)
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 [Updater] Verificando versiones...');
      if (mainWindow) mainWindow.webContents.send('checking_for_update');
    });

    // 2. NO HAY ACTUALIZACIONES (SEÑAL DE DESBLOQUEO)
    autoUpdater.on('update-not-available', () => {
      console.log('✅ [Updater] Todo al día.');
      if (mainWindow) mainWindow.webContents.send('update_not_available');
    });

    // 3. SÍ HAY ACTUALIZACIÓN (MANTENER BLOQUEO Y MOSTRAR BARRA)
    autoUpdater.on('update-available', (info) => {
      console.log(`⬇️ [Updater] Encontrada v${info.version}`);
      if (mainWindow) mainWindow.webContents.send('update_available');
    });

    // 4. PROGRESO DE DESCARGA
    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) mainWindow.webContents.send('update_progress', progressObj.percent);
    });

    // 5. DESCARGA LISTA
    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) mainWindow.webContents.send('update_downloaded');
      setTimeout(() => { autoUpdater.quitAndInstall(); }, 3000);
    });

    // 6. ERROR (IMPORTANTE: DESBLOQUEAR PARA NO DEJAR AL USUARIO ATRAPADO)
    autoUpdater.on('error', (err) => {
      console.error('⚠️ [Updater] Error:', err);
      if (mainWindow) mainWindow.webContents.send('update_error', err.message);
    });
  }
}

// ... (RESTO DEL SERVIDOR Y CREATEWINDOW IGUAL QUE ANTES) ...
require('./server.js'); 

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        title: "KESO - Sistema de Inventario",
        icon: path.join(__dirname, 'img/KESO.png'),
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        autoHideMenuBar: true
    });

    mainWindow.loadURL('http://localhost:3000');
    mainWindow.maximize();
    mainWindow.show();

    new AppUpdater();
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });