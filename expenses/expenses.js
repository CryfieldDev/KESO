const expenseForm = document.getElementById('expense-form');
const expensesList = document.getElementById('expenses-list');

// Estado de la Vista
let currentMode = 'week'; // 'week', 'month', 'year'
let currentDate = new Date(); // La fecha que estamos viendo actualmente

// Inicializar
updateView();

// --- 1. CONTROL DE FECHAS Y VISTAS ---

function setPeriod(mode) {
    currentMode = mode;
    // Actualizar botones visuales
    document.querySelectorAll('.period-selector button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
    
    // Resetear a fecha de hoy al cambiar modo para no perderse
    currentDate = new Date();
    updateView();
}

function changeDate(direction) {
    // Sumar o restar según el modo
    if (currentMode === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentMode === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentMode === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + direction);
    }
    updateView();
}

// --- 2. CÁLCULO DE RANGOS Y LLAMADA API ---

async function updateView() {
    let startDate, endDate, label;

    const d = new Date(currentDate);

    if (currentMode === 'week') {
        // Calcular inicio (Domingo) y fin (Sábado) de la semana
        const day = d.getDay();
        const diff = d.getDate() - day; // Ajustar al domingo
        startDate = new Date(d.setDate(diff));
        startDate.setHours(0,0,0,0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);

        label = `Semana del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;

    } else if (currentMode === 'month') {
        startDate = new Date(d.getFullYear(), d.getMonth(), 1);
        endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Último día del mes
        
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        label = `${meses[d.getMonth()]} ${d.getFullYear()}`;

    } else if (currentMode === 'year') {
        startDate = new Date(d.getFullYear(), 0, 1);
        endDate = new Date(d.getFullYear(), 11, 31);
        label = `Año ${d.getFullYear()}`;
    }

    document.getElementById('period-display').innerText = label;

    // LLAMADA AL SERVIDOR
    try {
        const res = await fetch(`${window.API_URL}/finance-range`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ startDate, endDate })
        });
        const data = await res.json();
        renderDashboard(data);

    } catch (e) { console.error(e); }
}

// --- 3. RENDERIZADO VISUAL ---

function renderDashboard(data) {
    // 1. Tarjeta Grande (Héroe)
    const hero = document.getElementById('hero-card');
    const balText = document.getElementById('main-balance');
    const statusText = document.getElementById('balance-status');

    // Convertimos a número para asegurar decimales correctos con MySQL
    balText.innerText = `$${Number(data.balance).toFixed(2)}`;
    
    // Resetear clases
    hero.className = 'balance-hero';
    
    if (data.balance > 0) {
        hero.classList.add('balance-positive');
        statusText.innerText = "¡Ganancia Neta! 🤑";
    } else if (data.balance < 0) {
        hero.classList.add('balance-negative');
        statusText.innerText = "Pérdida en este periodo 📉";
    } else {
        hero.classList.add('balance-neutral');
        statusText.innerText = "Sin movimientos o en cero";
    }

    // 2. Estadísticas pequeñas (Forzamos Number() por si MySQL devuelve strings)
    document.getElementById('stat-income').innerText = `$${Number(data.totalIngresos).toFixed(2)}`;
    document.getElementById('stat-expense').innerText = `$${Number(data.totalGastos).toFixed(2)}`;
    document.getElementById('stat-fixed').innerText = `$${Number(data.gastosFijos).toFixed(2)}`;
    document.getElementById('stat-variable').innerText = `$${Number(data.gastosVariables).toFixed(2)}`;

    // 3. Tabla
    expensesList.innerHTML = '';
    if (data.listaGastos.length === 0) {
        expensesList.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#aaa;">No hay gastos en este periodo.</td></tr>';
    } else {
        data.listaGastos.forEach(exp => {
            const fecha = new Date(exp.fecha).toLocaleDateString();
            const tipoBadge = exp.tipo === 'Fijo' 
                ? '<span class="badge" style="background:#E3F2FD; color:#1565C0;">Fijo</span>'
                : '<span class="badge" style="background:#FFEBEE; color:#C62828;">Variable</span>';

            const row = document.createElement('tr');
            // CAMBIO AQUÍ: exp.id en lugar de exp._id
            row.innerHTML = `
                <td>${fecha}</td>
                <td><b>${exp.concepto}</b></td>
                <td>${tipoBadge}</td>
                <td>${exp.categoria}</td>
                <td style="text-align: right; color: #D32F2F;">-$${Number(exp.monto).toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="deleteExpense('${exp.id}')" style="border:none; background:none; color:#999; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            expensesList.appendChild(row);
        });
    }
}

// --- 4. GUARDAR Y BORRAR ---

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newExpense = {
        concepto: document.getElementById('exp-concept').value,
        tipo: document.getElementById('exp-type').value, // Fijo o Variable
        categoria: document.getElementById('exp-category').value,
        monto: parseFloat(document.getElementById('exp-amount').value)
    };

    try {
        await fetch(`${window.API_URL}/expenses`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newExpense)
        });
        expenseForm.reset();
        updateView(); // Recargar datos actuales
        showToast('Gasto registrado', 'success');
    } catch (e) { showToast('Error', 'error'); }
});

window.deleteExpense = async (id) => {
    if(confirm('¿Eliminar gasto?')) {
        await fetch(`${window.API_URL}/expenses/${id}`, { method: 'DELETE' });
        updateView();
        showToast('Eliminado', 'success');
    }
};