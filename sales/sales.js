const salesContainer = document.getElementById('sales-container'); // Contenedor general (por si acaso)
const tableBody = document.getElementById('sales-table-body'); // El cuerpo de la tabla
const searchInput = document.getElementById('sales-search');
const weekDisplay = document.getElementById('current-week-display');
const totalLabel = document.getElementById('total-sales-cash'); // El H3 de finanzas

const API_SALES = `${window.API_URL}/sales`;

let allSales = [];
let currentWeekStart = getStartOfWeek(new Date());

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadSales();
});

async function loadSales() {
    try {
        // Obtenemos ventas (incluyendo la relación con Receivable gracias al backend)
        const res = await fetch(API_SALES);
        allSales = await res.json();
        renderSales();
    } catch (error) { 
        console.error(error);
        if(window.showToast) showToast('Error cargando historial', 'error'); 
    }
}

function renderSales() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    let filteredSales = [];
    let isSearchMode = searchTerm.length > 0;

    // 1. FILTRADO (Búsqueda o Semana)
    if (isSearchMode) {
        filteredSales = allSales.filter(sale => 
            (sale.cliente && sale.cliente.toLowerCase().includes(searchTerm)) ||
            (sale.numero_orden && sale.numero_orden.toLowerCase().includes(searchTerm)) ||
            (sale.vendedor && sale.vendedor.toLowerCase().includes(searchTerm))
        );
        weekDisplay.innerText = "Resultados búsqueda";
    } else {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
        currentWeekEnd.setHours(23, 59, 59, 999);

        filteredSales = allSales.filter(sale => {
            const saleDate = new Date(sale.fecha);
            return saleDate >= currentWeekStart && saleDate <= currentWeekEnd;
        });

        const startStr = currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const endStr = currentWeekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        weekDisplay.innerText = `${startStr} - ${endStr}`;
    }

    drawTable(filteredSales);
}

function drawTable(salesData) {
    // Si no hay tabla (por si el HTML no cargó bien), salimos
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (salesData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#777;">No hay ventas en este periodo.</td></tr>';
        if(totalLabel) totalLabel.innerHTML = 'Sin movimientos';
        return;
    }

    // 2. CÁLCULO DE FINANZAS (REAL vs PENDIENTE)
    let dineroEnCaja = 0;      
    let dineroPorCobrar = 0;   

    salesData.forEach(sale => {
        let estaPendiente = false;

        // Verificamos si tiene deuda pendiente
        if (sale.Receivable && sale.Receivable.estado === 'pendiente') {
            estaPendiente = true;
        }

        if (estaPendiente) {
            dineroPorCobrar += parseFloat(sale.total);
        } else {
            dineroEnCaja += parseFloat(sale.total);
        }
    });

    // 3. ACTUALIZAR ENCABEZADO DE FINANZAS
    if(totalLabel) {
        totalLabel.innerHTML = `
            <i class="fas fa-cash-register"></i> Caja: <span style="color:#2E7D32;">$${dineroEnCaja.toFixed(2)}</span> 
            <span style="font-size:0.8em; color:#EF6C00; margin-left:15px; font-weight:normal;">
                (Por Cobrar: $${dineroPorCobrar.toFixed(2)})
            </span>
        `;
    }

    // 4. DIBUJAR FILAS
    salesData.forEach(sale => {
        const fechaObj = new Date(sale.fecha);
        const fecha = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const hora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' });

        // Lógica de Estado
        let esCredito = false;
        let estaPendiente = false;

        if (sale.Receivable) {
            esCredito = true;
            if (sale.Receivable.estado === 'pendiente') {
                estaPendiente = true;
            }
        }

        // Crear Fila
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        // Si está pendiente, pintamos fondo NARANJA
        if (estaPendiente) {
            tr.style.backgroundColor = '#FFF3E0'; 
            tr.style.color = '#E65100';
        }

        // Badge de Estado
        let badgeEstado = '<span class="badge" style="background:#E8F5E9; color:#2E7D32;">PAGADO</span>';
        if (estaPendiente) {
            badgeEstado = '<span class="badge" style="background:#FFE0B2; color:#EF6C00;"><i class="fas fa-clock"></i> PENDIENTE</span>';
        } else if (esCredito && !estaPendiente) {
            badgeEstado = '<span class="badge" style="background:#E3F2FD; color:#1565C0;">CREDITO PAGADO</span>';
        }

        tr.innerHTML = `
            <td style="padding:15px; font-weight:bold;">${sale.numero_orden}</td>
            <td style="padding:15px;">${fecha} <small style="color:#888;">${hora}</small></td>
            <td style="padding:15px;">${sale.cliente || 'Consumidor Final'}</td>
            <td style="padding:15px;">${sale.vendedor || '---'}</td>
            <td style="padding:15px; font-weight:bold; font-size:1.1em;">$${parseFloat(sale.total).toFixed(2)}</td>
            <td style="padding:15px;">${badgeEstado}</td>
            <td style="padding:15px; text-align:center;">
                <button onclick="printTicket('${sale.id}')" class="btn-icon" title="Imprimir Ticket" style="background:transparent; border:none; color:var(--color-principal-azul); font-size:1.2em; cursor:pointer;">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// === FUNCIÓN DE IMPRESIÓN (TU VERSIÓN PERSONALIZADA) ===
window.printTicket = (id) => {
    // Buscar venta en la lista cargada en memoria
    const sale = allSales.find(s => s.id == id);
    if (!sale) return showToast("No se encontró la venta", "error");

    const fecha = new Date(sale.fecha).toLocaleDateString('es-ES');
    const hora = new Date(sale.fecha).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
    const nombreCliente = sale.cliente ? sale.cliente : 'Cliente'; 
    
    // Nombre del archivo PDF
    const nombreArchivo = `Ticket_${sale.numero_orden}_${nombreCliente.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let itemsHTML = '';
    if(sale.productos && sale.productos.length > 0) {
        sale.productos.forEach(p => {
            const subtotal = Number(p.subtotal) || 0;
            itemsHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.95em; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                    <span style="flex:1;">${p.cantidad} x ${p.nombre}</span>
                    <span style="font-weight:600;">REF ${subtotal.toFixed(2)}</span>
                </div>
            `;
        });
    } else {
        itemsHTML = '<div style="text-align:center; color:#999;">Sin detalles de productos</div>';
    }

    // Inyectar HTML en zona de impresión
    const ticketArea = document.getElementById('ticket-print-area');
    
    ticketArea.innerHTML = `
        <div style="font-family: 'Courier New', monospace; width: 300px; padding: 10px; color: black; margin: 0 auto;">
            
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
                <h1 style="color: #000; font-weight: 800; font-size: 1.4em; margin: 0; letter-spacing: 1px;">KESO SYSTEM</h1>
                <br>
                <div style="border: 2px dashed #000; padding: 8px; font-weight: bold; font-size: 1em; text-transform: uppercase;">
                    DOCUMENTO NO FISCAL
                    <br>NOTA DE ENTREGA
                </div>
            </div>

            <div style="text-align: left; font-size: 0.85em; color: #000; margin-bottom: 15px;">
                Orden: <b>${sale.numero_orden}</b><br>
                Fecha: ${fecha} | ${hora}<br>
                Cliente: ${sale.cliente || 'Consumidor Final'}<br>
                Vendedor: ${sale.vendedor || 'Sistema'}
            </div>

            <div style="text-align: left; margin: 20px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0;">
                ${itemsHTML}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; font-size: 1.2em;">
                <span style="font-weight: bold; color: #000;">TOTAL</span>
                <span style="font-weight: 900; color: #000; font-size: 1.3em;">REF ${Number(sale.total).toFixed(2)}</span>
            </div>

            <div style="font-size: 0.8em; color: #000; margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">
                <p style="margin:2px; font-weight: bold;">*** SIN VALOR FISCAL ***</p>
                <p style="margin:5px;">¡Gracias por su compra!</p>
            </div>
        </div>
    `;

    const originalTitle = document.title;
    document.title = nombreArchivo;

    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 500);
};

// Navegación y Utilidades
window.changeWeek = (offset) => {
    currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
    searchInput.value = ''; 
    renderSales();
};

searchInput.addEventListener('input', () => renderSales());

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que Lunes sea inicio (opcional) o Domingo
    // Si prefieres Domingo como inicio usa: const diff = d.getDate() - day;
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
}