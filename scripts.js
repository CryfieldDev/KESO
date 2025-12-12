// === 1. SISTEMA DE NOTIFICACIONES ===
function showToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${tipo}`);
    
    let icono = '<i class="fas fa-info-circle"></i>';
    if (tipo === 'success') icono = '<i class="fas fa-check-circle"></i>';
    if (tipo === 'error') icono = '<i class="fas fa-times-circle"></i>';
    if (tipo === 'warning') icono = '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `${icono} <span>${mensaje}</span>`;
    container.appendChild(toast);

    setTimeout(() => { toast.classList.add('show'); }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// === 2. LÓGICA DE LOGIN ===
const loginForm = document.getElementById('login-form');
const BASE_URL = 'http://localhost:3000/api';

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();

            if (response.ok) {
                showToast(`¡Bienvenido, ${username}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard/dashboard.html';
                }, 1500);
            } else {
                // Muestra error ROJO si falla (Usuario no existe o pass mal)
                showToast(data.message || 'Error de acceso', 'error');
            }

        } catch (error) {
            console.error(error);
            showToast('No se pudo conectar con el servidor', 'error');
        }
    });
}