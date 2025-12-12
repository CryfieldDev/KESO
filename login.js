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
                showToast(`¡Bienvenido, ${username}!`, 'success', 2500);
                // Retraso para que el usuario vea el mensaje de éxito
                setTimeout(() => {
                    window.location.href = 'dashboard/dashboard.html';
                }, 1000); 
                
            } else {
                // USAMOS showToast para los errores
                showToast(data.message, 'error', 3500); 
            }

        } catch (error) {
            console.error(error);
            showToast('Error de conexión con el servidor. ¿Está el backend activo?', 'error', 5000);
        }
    });
}