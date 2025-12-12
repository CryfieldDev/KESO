const { app, BrowserWindow } = require('electron');
const path = require('path');

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
        autoHideMenuBar: true // Oculta la barra de menú (Archivo, Ver...)
    });

    // Cargar la URL de tu servidor local
    win.loadURL('http://localhost:3000');

    // === TRUCO PARA MAXIMIZAR ===
    // Maximizar la ventana y luego mostrarla
    win.maximize();
    win.show();

    // Opcional: Si quieres pantalla completa REAL (tipo kiosco, sin bordes ni barra de tareas)
    // usa: win.setFullScreen(true);
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