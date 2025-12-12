/* ===========================================================
   GLOBAL.JS - Lógica compartida para toda la App KESO
   =========================================================== */

// 1. VARIABLE GLOBAL API
window.API_URL = 'http://localhost:3000/api';

// 2. INYECTAR HTML GLOBAL AL CARGAR
document.addEventListener('DOMContentLoaded', () => {
    
    // A) Contenedor de Notificaciones (Si no existe)
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // B) Modal de Confirmación
    if (!document.getElementById('custom-confirm-modal')) {
        const modal = document.createElement('div');
        modal.id = 'custom-confirm-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <i class="fas fa-question-circle"></i> Confirmación
                </div>
                <div class="modal-body" id="confirm-msg-text">
                    ¿Estás seguro de realizar esta acción?
                </div>
                <div class="modal-footer">
                    <button id="btn-confirm-no" class="btn-modal btn-cancel">Cancelar</button>
                    <button id="btn-confirm-yes" class="btn-modal btn-confirm">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
});

// ==========================================
// 3. SISTEMA DE NOTIFICACIONES (LIQUID GLASS)
// ==========================================
window.showToast = function(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // A) Definir Icono según tipo
    let iconClass = 'fa-info-circle';
    if (tipo === 'success') iconClass = 'fa-check-circle';
    if (tipo === 'error') iconClass = 'fa-times-circle'; // O fa-exclamation-circle
    if (tipo === 'warning') iconClass = 'fa-exclamation-triangle';

    // B) Crear el Elemento HTML
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`; // Clase base + modificador de color
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${mensaje}</span>
    `;

    // C) Agregar al DOM
    container.appendChild(toast);

    // D) Animación de Entrada (Pequeño delay para que CSS detecte el cambio)
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
    });

    // E) Animación de Salida y Limpieza
    setTimeout(() => {
        toast.classList.remove('show'); // Inicia la salida
        
        // Esperar a que termine la transición CSS (0.5s) antes de borrar del DOM
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 600); 
    }, 4000); // Duración visible
};

// ==========================================
// 4. FUNCIÓN DE CONFIRMACIÓN (Promesa)
// ==========================================
window.showConfirm = function(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const msgText = document.getElementById('confirm-msg-text');
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        // Configurar mensaje y mostrar
        msgText.textContent = mensaje;
        modal.classList.add('show');

        // Función de limpieza interna
        const closeAndResolve = (result) => {
            modal.classList.remove('show');
            // Quitamos los listeners viejos clonando los botones
            // (Evita que se ejecute la acción múltiples veces si reúsas el modal)
            const newYes = btnYes.cloneNode(true);
            const newNo = btnNo.cloneNode(true);
            btnYes.parentNode.replaceChild(newYes, btnYes);
            btnNo.parentNode.replaceChild(newNo, btnNo);
            
            resolve(result);
        };

        // Asignar eventos temporales
        // Nota: Al usar onclick directo aquí simplificamos la lógica de limpieza anterior
        btnYes.onclick = () => closeAndResolve(true);
        btnNo.onclick = () => closeAndResolve(false);
    });
};