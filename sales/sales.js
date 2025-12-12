const salesContainer = document.getElementById('sales-container');
const searchInput = document.getElementById('sales-search');
const weekDisplay = document.getElementById('current-week-display');
const API_SALES = `${window.API_URL}/sales`;

let allSales = [];
let currentWeekStart = getStartOfWeek(new Date());

// Inicializar
loadSales();

async function loadSales() {
    try {
        const res = await fetch(API_SALES);
        allSales = await res.json();
        renderSales();
    } catch (error) { 
        console.error(error);
        showToast('Error cargando historial', 'error'); 
    }
}

function renderSales() {
    salesContainer.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase().trim();
    let filteredSales = [];
    let isSearchMode = searchTerm.length > 0;

    if (isSearchMode) {
        filteredSales = allSales.filter(sale => 
            (sale.cliente && sale.cliente.toLowerCase().includes(searchTerm)) ||
            (sale.numero_orden && sale.numero_orden.toLowerCase().includes(searchTerm))
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

    if (filteredSales.length === 0) {
        salesContainer.innerHTML = `<div class="panel" style="text-align:center; padding:40px; color:#777;"><h3>No hay ventas en este periodo.</h3></div>`;
        return;
    }

    drawTable(filteredSales);
}

function drawTable(salesData) {
    const totalAmount = salesData.reduce((acc, s) => Number(acc) + Number(s.total), 0);
    
    const panel = document.createElement('div');
    panel.className = 'panel'; panel.style.padding = '0';

    const header = document.createElement('div');
    header.style.padding = '15px'; header.style.background = '#f9f9f9'; header.style.textAlign = 'right';
    header.innerHTML = `<span style="font-weight:bold;">Total Periodo: <span style="color:#2E7D32;">$${totalAmount.toFixed(2)}</span></span>`;

    let rowsHTML = '';
    salesData.forEach(sale => {
        const fecha = new Date(sale.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' });
        const orden = sale.numero_orden || '---';

        let prods = '<ul class="products-detail">';
        if(sale.productos) {
            sale.productos.forEach(p => { 
                prods += `<li><b>${p.nombre}</b>: ${p.cantidad} <small>x $${p.precio_unitario}</small></li>`; 
            });
        }
        prods += '</ul>';

        rowsHTML += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:15px; vertical-align:top;"><span class="order-badge">${orden}</span><br><small style="color:#888;">${fechaStr}</small></td>
                <td style="padding:15px; vertical-align:top;"><div style="font-weight:600; color:var(--color-principal-azul);">${sale.cliente || 'Consumidor Final'}</div><div style="font-size:0.85em; color:#666;">Vendedor: ${sale.vendedor || '---'}</div></td>
                <td style="padding:15px; vertical-align:top;">${prods}</td>
                <td style="padding:15px; vertical-align:top; text-align:right; font-weight:bold; color:#2E7D32;">$${Number(sale.total).toFixed(2)}</td>
                <td style="padding:15px; vertical-align:top; text-align:center;">
                    <button onclick="printTicket('${sale.id}')" class="btn btn-acento-secundario" style="padding: 8px 12px; font-size: 0.9em; width: auto; color: var(--color-principal-azul); border-color: var(--color-principal-azul);" title="Imprimir Ticket">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>`;
    });

    panel.innerHTML = `<table class="full-table">
        <thead>
            <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th style="text-align:right;">Total</th>
                <th style="text-align:center; width: 80px;">Ticket</th>
            </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
    </table>`;
    
    salesContainer.appendChild(header);
    salesContainer.appendChild(panel);
}

// === FUNCIÓN DE IMPRESIÓN ===
window.printTicket = (id) => {
    // Buscar venta (usamos == para que coincida string '1' con number 1)
    const sale = allSales.find(s => s.id == id);
    if (!sale) return showToast("No se encontró la venta", "error");

    const fecha = new Date(sale.fecha).toLocaleDateString('es-ES');
    const hora = new Date(sale.fecha).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
    const nombreCliente = sale.cliente ? sale.cliente.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente'; 
    
    // Nombre del archivo PDF
    const nombreArchivo = `Ticket_${sale.numero_orden}_${nombreCliente}`;

    let itemsHTML = '';
    if(sale.productos && sale.productos.length > 0) {
        sale.productos.forEach(p => {
            const subtotal = Number(p.subtotal) || 0;
            itemsHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.95em; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
                    <span style="flex:1;">${p.cantidad} x ${p.nombre}</span>
                    <span style="font-weight:600;">$${subtotal.toFixed(2)}</span>
                </div>
            `;
        });
    } else {
        itemsHTML = '<div style="text-align:center; color:#999;">Sin detalles de productos</div>';
    }

    // Inyectar HTML en el área oculta de impresión
    const ticketArea = document.getElementById('ticket-print-area');
    ticketArea.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #444; max-width: 350px; margin: 0 auto; text-align: center;">
            <div style="margin-bottom: 20px; border-bottom: 2px solid #0047c0; padding-bottom: 15px;">
                <img src="/img/logo1.png" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #0047c0; margin-bottom: 10px;">
                <h1 style="color: #0047c0; font-weight: 800; font-size: 1.4em; margin: 0; letter-spacing: 1px;">KESO SYSTEM</h1>
                <div style="font-size: 0.85em; color: #666; margin-top: 5px; line-height: 1.4;">
                    Orden: <b>${sale.numero_orden}</b><br>
                    ${fecha} | ${hora}<br>
                    Cliente: ${sale.cliente || 'Consumidor Final'}
                </div>
            </div>

            <div style="text-align: left; margin: 20px 0; border-bottom: 2px solid #0047c0; padding-bottom: 10px;">
                ${itemsHTML}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; font-size: 1.2em;">
                <span style="font-weight: bold; color: #333;">TOTAL</span>
                <span style="font-weight: 900; color: #0047c0; font-size: 1.3em;">$${Number(sale.total).toFixed(2)}</span>
            </div>

            <div style="font-size: 0.8em; color: #888; margin-top: 30px; text-align: center;">
                <p style="margin:2px;">¡Gracias por su compra!</p>
                <p style="margin:2px;">Atendido por: ${sale.vendedor || 'Sistema'}</p>
            </div>
        </div>
    `;

    // Cambiar título temporalmente para el nombre del PDF
    const originalTitle = document.title;
    document.title = nombreArchivo;

    // Ejecutar impresión con un pequeño retraso para asegurar que el DOM se pintó
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
        // NOTA: No borramos el innerHTML inmediatamente para evitar que salga blanco si la impresora es lenta.
        // ticketArea.innerHTML = ''; 
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
    const diff = d.getDate() - day; // Ajustar al domingo (o lunes según prefieras)
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
}