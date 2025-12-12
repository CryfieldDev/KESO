const { app, BrowserWindow, ipcMain } = require('electron'); // <--- Importante: ipcMain
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// ==========================================
// 1. CLASE APP UPDATER
// ==========================================
class AppUpdater {
  constructor() {
    // Configuración para desarrollo y sin firma
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }
    autoUpdater.verifyUpdateCodeSignature = false; 

    // Iniciar escuchas
    this.setupListeners();
    
    // Esperar 1.5s a que la ventana cargue para empezar a buscar
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 1500);
  }

  setupListeners() {
    // 1. Empezó a buscar -> Bloquear UI
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 [Updater] Verificando versiones...');
      if (mainWindow) mainWindow.webContents.send('checking_for_update');
    });

    // 2. No hay nada nuevo -> Desbloquear UI
    autoUpdater.on('update-not-available', () => {
      console.log('✅ [Updater] Todo al día.');
      if (mainWindow) mainWindow.webContents.send('update_not_available');
    });

    // 3. ¡Encontró algo! -> Mostrar barra
    autoUpdater.on('update-available', (info) => {
      console.log(`⬇️ [Updater] Encontrada v${info.version}`);
      if (mainWindow) mainWindow.webContents.send('update_available');
    });

    // 4. Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) mainWindow.webContents.send('update_progress', progressObj.percent);
    });

    // 5. Descarga lista -> Avisar e instalar
    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) mainWindow.webContents.send('update_downloaded');
      setTimeout(() => {
        autoUpdater.quitAndInstall(); 
      }, 3000);
    });
    
    // 6. Error -> Desbloquear por seguridad
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
        icon: path.join(__dirname, 'img/KESO.png'),
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadURL('http://localhost:3000');
    mainWindow.maximize();
    mainWindow.show();

    // Iniciar el actualizador
    new AppUpdater();
}

// ==========================================
// 4. EVENTO PARA RE-CHEQUEAR (Solución Logout)
// ==========================================
ipcMain.on('manual-check-update', () => {
    console.log('🔄 [Main] El Login pidió verificar actualizaciones de nuevo.');
    autoUpdater.checkForUpdatesAndNotify();
});

// Ciclo de vida de la App
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});