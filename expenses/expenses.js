document.addEventListener('DOMContentLoaded', () => {
    updateView();
});

// =======================================================
// VARIABLES Y CONFIGURACIÓN
// =======================================================
const expenseForm = document.getElementById('expense-form');
const expensesList = document.getElementById('expenses-list');
let currentMode = 'week';
let currentDate = new Date();

// =======================================================
// LÓGICA DE ELIMINACIÓN (Usando el diseño de Billing)
// =======================================================
window.tryDeleteExpense = async (id) => {
    // Usamos la misma lógica de confirmación que en Facturación
    // para asegurar que el diseño de la alerta sea idéntico.
    const ok = typeof showConfirm === 'function' 
        ? await showConfirm('¿Estás seguro de eliminar este gasto?') 
        : confirm('¿Estás seguro de eliminar este gasto?');

    if (ok) {
        try {
            await fetch(`${window.API_URL}/expenses/${id}`, { method: 'DELETE' });
            updateView(); // Recargar la tabla
            if (window.showToast) showToast('Gasto eliminado', 'success');
        } catch (e) {
            console.error(e);
            if (window.showToast) showToast('Error al eliminar', 'error');
        }
    }
};

// =======================================================
// CONTROL DE FECHAS
// =======================================================
window.setPeriod = function(mode) {
    currentMode = mode;
    document.querySelectorAll('.period-selector button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
    currentDate = new Date();
    updateView();
}

window.changeDate = function(direction) {
    if (currentMode === 'week') currentDate.setDate(currentDate.getDate() + (direction * 7));
    else if (currentMode === 'month') currentDate.setMonth(currentDate.getMonth() + direction);
    else if (currentMode === 'year') currentDate.setFullYear(currentDate.getFullYear() + direction);
    updateView();
}

// =======================================================
// CARGAR DATOS
// =======================================================
async function updateView() {
    let startDate, endDate, label;
    const d = new Date(currentDate);

    if (currentMode === 'week') {
        const day = d.getDay();
        const diff = d.getDate() - day; 
        startDate = new Date(d.setDate(diff)); startDate.setHours(0,0,0,0);
        endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23,59,59,999);
        label = `Semana del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;
    } else if (currentMode === 'month') {
        startDate = new Date(d.getFullYear(), d.getMonth(), 1);
        endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        label = `${meses[d.getMonth()]} ${d.getFullYear()}`;
    } else if (currentMode === 'year') {
        startDate = new Date(d.getFullYear(), 0, 1);
        endDate = new Date(d.getFullYear(), 11, 31);
        label = `Año ${d.getFullYear()}`;
    }

    const display = document.getElementById('period-display');
    if(display) display.innerText = label;

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

// =======================================================
// RENDERIZAR TABLA Y TARJETAS
// =======================================================
function renderDashboard(data) {
    const hero = document.getElementById('hero-card');
    document.getElementById('main-balance').innerText = `$${Number(data.balance).toFixed(2)}`;
    
    hero.className = 'balance-hero';
    if (data.balance > 0) { hero.classList.add('balance-positive'); document.getElementById('balance-status').innerText = "¡Ganancia Neta! 🤑"; }
    else if (data.balance < 0) { hero.classList.add('balance-negative'); document.getElementById('balance-status').innerText = "Pérdida 📉"; }
    else { hero.classList.add('balance-neutral'); document.getElementById('balance-status').innerText = "Sin movimientos"; }

    document.getElementById('stat-income').innerText = `$${Number(data.totalIngresos).toFixed(2)}`;
    document.getElementById('stat-expense').innerText = `$${Number(data.totalGastos).toFixed(2)}`;
    document.getElementById('stat-fixed').innerText = `$${Number(data.gastosFijos).toFixed(2)}`;
    document.getElementById('stat-variable').innerText = `$${Number(data.gastosVariables).toFixed(2)}`;

    expensesList.innerHTML = '';
    if (!data.listaGastos || data.listaGastos.length === 0) {
        expensesList.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#aaa;">No hay gastos en este periodo.</td></tr>';
    } else {
        data.listaGastos.forEach(exp => {
            const fecha = new Date(exp.fecha).toLocaleDateString();
            const tipoBadge = exp.tipo === 'Fijo' 
                ? '<span class="badge" style="background:#E3F2FD; color:#1565C0; padding:2px 8px; border-radius:4px; font-size:0.85em;">Fijo</span>'
                : '<span class="badge" style="background:#FFEBEE; color:#C62828; padding:2px 8px; border-radius:4px; font-size:0.85em;">Variable</span>';

            const row = document.createElement('tr');
            const idGasto = exp.id || exp._id; 
            
            row.innerHTML = `
                <td>${fecha}</td>
                <td><b>${exp.concepto}</b></td>
                <td>${tipoBadge}</td>
                <td>${exp.categoria}</td>
                <td style="text-align: right; color: #D32F2F;">-$${Number(exp.monto).toFixed(2)}</td>
                <td style="text-align: center;">
                    <button class="btn-delete-icon" onclick="tryDeleteExpense('${idGasto}')" style="border:none; background:none; color:#999; cursor:pointer; font-size:1.1em;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            const btn = row.querySelector('.btn-delete-icon');
            btn.addEventListener('mouseenter', () => btn.style.color = '#dc3545');
            btn.addEventListener('mouseleave', () => btn.style.color = '#999');

            expensesList.appendChild(row);
        });
    }
}

// =======================================================
// GUARDAR GASTO
// =======================================================
if(expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newExpense = {
            concepto: document.getElementById('exp-concept').value,
            tipo: document.getElementById('exp-type').value,
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
            updateView(); 
            if (window.showToast) showToast('Gasto guardado', 'success');
        } catch (e) { 
            if (window.showToast) showToast('Error al guardar', 'error');
        }
    });
}