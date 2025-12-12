const STATS_URL = `${window.API_URL}/dashboard-stats`;

document.addEventListener('DOMContentLoaded', () => {
    // 1. RECUPERAR NOMBRE DE USUARIO (Guardado en Login)
    const currentUser = localStorage.getItem('keso_user') || 'Usuario';
    const userGreeting = document.getElementById('user-greeting');
    if (userGreeting) {
        userGreeting.innerText = `Hola, ${currentUser} 👋`;
    }

    // 2. Cargar Estadísticas
    loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        const res = await fetch(STATS_URL);
        const data = await res.json();

        if (res.ok) {
            // Actualizar números en pantalla
            // MySQL devuelve strings para decimales, pero el backend ya hace toFixed(2)
            // Aun así, aseguramos que se vea bien.
            
            document.getElementById('stat-total').innerText = data.totalProductos;
            
            // Usamos un fallback '0.00' por si el dato viene vacío
            const valor = data.valorInventario || '0.00';
            const ganancia = data.gananciaEstimada || '0.00';

            document.getElementById('stat-valor').innerText = `$${valor}`;
            document.getElementById('stat-ganancia').innerText = `$${ganancia}`;
        } else {
            console.error('Error cargando stats');
        }
    } catch (error) {
        console.error('Error de conexión', error);
        // Si tienes un sistema de Toast global, úsalo, si no, ignora.
        if (window.showToast) showToast('No se pudieron cargar las estadísticas', 'error');
    }
}