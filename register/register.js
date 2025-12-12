document.body.style.backgroundImage = 'url(../img/fondo.jpg)';
const form = document.getElementById('register-form');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    const btn = form.querySelector('button');

    // Feedback visual para que el usuario sepa que está cargando
    const textoOriginal = btn.innerText;
    btn.innerText = 'Creando cuenta...';
    btn.disabled = true;

    try {
        // CAMBIO IMPORTANTE: Usamos window.API_URL
        // Esto asegura que funcione tanto en tu PC como en la del cliente
        const res = await fetch(`${window.API_URL}/register`, {
            method: 'POST', 
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        
        const data = await res.json();
        
        if(res.ok) {
            alert('¡Cuenta creada con éxito! Ahora inicia sesión.');
            window.location.href = '../index.html';
        } else {
            alert('Error: ' + (data.message || 'No se pudo crear la cuenta'));
        }
    } catch(e) { 
        console.error(e);
        alert('Error de conexión con el servidor. Verifica tu internet.'); 
    } finally {
        // Restaurar botón
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
});