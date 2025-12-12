/* ===========================================================
   GLOBAL.JS - Lógica compartida para toda la App KESO
   =========================================================== */

// 1. INYECTAR HTML GLOBAL (Toasts y Modal)
document.addEventListener('DOMContentLoaded', () => {
    
    // A) Contenedor de Notificaciones
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // B) Modal de Confirmación (NUEVO)
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

// 2. FUNCIÓN DE NOTIFICACIÓN (TOAST)
window.showToast = function(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    let icono = '<i class="fas fa-info-circle"></i>';
    if (tipo === 'success') icono = '<i class="fas fa-check-circle"></i>';
    if (tipo === 'error') icono = '<i class="fas fa-times-circle"></i>';
    if (tipo === 'warning') icono = '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `${icono} <span>${mensaje}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => { toast.classList.add('show'); });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => { toast.remove(); });
    }, 3500);
};

// 3. FUNCIÓN DE CONFIRMACIÓN PERSONALIZADA (Promesa)
window.showConfirm = function(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const msgText = document.getElementById('confirm-msg-text');
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        // Configurar mensaje
        msgText.textContent = mensaje;
        
        // Mostrar modal
        modal.classList.add('show');

        // Función para limpiar y cerrar
        const close = () => {
            modal.classList.remove('show');
            // Clonamos los botones para eliminar los EventListeners viejos
            // Esto evita que se acumulen clics si abres el modal muchas veces
            const newYes = btnYes.cloneNode(true);
            const newNo = btnNo.cloneNode(true);
            btnYes.parentNode.replaceChild(newYes, btnYes);
            btnNo.parentNode.replaceChild(newNo, btnNo);
        };

        // Manejar Clics
        // NOTA: Usamos onclick aquí temporalmente antes de clonar para resolver la promesa
        btnYes.onclick = () => {
            close();
            resolve(true); // El usuario dijo SÍ
        };

        btnNo.onclick = () => {
            close();
            resolve(false); // El usuario dijo NO
        };
    });
};

// 4. VARIABLE GLOBAL API
window.API_URL = 'http://localhost:3000/api';