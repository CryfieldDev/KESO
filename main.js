const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// ==========================================
// 1. CONFIGURACIÓN DE ACTUALIZACIONES
// ==========================================

// Truco para probar actualizaciones en modo desarrollo (npm start)
// Si borras esto, solo funcionará cuando generes el .exe instalado
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
}

// Logs para la terminal (Así sabrás si funciona)
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Buscando actualizaciones en GitHub...');
});
autoUpdater.on('update-available', (info) => {
  console.log('✅ ¡Actualización disponible detectada!', info.version);
});
autoUpdater.on('update-not-available', (info) => {
  console.log('❌ No hay actualizaciones nuevas. Tienes la última versión.');
});
autoUpdater.on('error', (err) => {
  console.log('⚠️ Error en el sistema de actualizaciones:', err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "⬇️ Descargando: " + progressObj.percent.toFixed(2) + '%';
  console.log(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('📦 Actualización descargada. Se instalará automáticamente al cerrar.');
});

// ==========================================
// 2. SERVIDOR BACKEND
// ==========================================
// Importamos el servidor para que arranque junto con la App
require('./server.js'); 

function createWindow() {
    // Crear la ventana del navegador
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "KESO - Sistema de Inventario",
        icon: path.join(__dirname, 'img/KESO.png'), // Tu icono
        show: false, // <--- IMPORTANTE: No mostrarla todavía
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true // Oculta la barra de menú
    });

    // Cargar la URL de tu servidor local
    win.loadURL('http://localhost:3000');

    // Maximizar la ventana y luego mostrarla
    win.maximize();
    win.show();

    // ==========================================
    // 3. INICIAR BÚSQUEDA DE ACTUALIZACIONES
    // ==========================================
    // Esto se ejecuta apenas se abre la ventana
    autoUpdater.checkForUpdatesAndNotify();
}

// Cuando Electron esté listo
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