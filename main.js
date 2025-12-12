const { app, BrowserWindow } = require('electron');
const path = require('path');
// 1. IMPORTAR EL ACTUALIZADOR
const { autoUpdater } = require('electron-updater'); 

// Importamos el servidor
require('./server.js'); 

function createWindow() {
    const win = new BrowserWindow({
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

    win.loadURL('http://localhost:3000');
    win.maximize();
    win.show();
    
    // 2. BUSCAR ACTUALIZACIONES CUANDO LA VENTANA ESTÉ LISTA
    // Esto buscará una nueva versión en tu GitHub automáticamente
    autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 3. (OPCIONAL) LOGS DE ACTUALIZACIÓN
// Si quieres ver qué pasa en la consola negra al desarrollar:
autoUpdater.on('checking-for-update', () => {
  console.log('Buscando actualizaciones...');
});
autoUpdater.on('update-available', (info) => {
  console.log('¡Actualización disponible!', info);
});
autoUpdater.on('update-not-available', (info) => {
  console.log('Tienes la última versión.');
});
autoUpdater.on('error', (err) => {
  console.log('Error en auto-updater: ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  console.log('Descargando: ' + progressObj.percent + '%');
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('Actualización descargada. Se instalará al cerrar.');
});