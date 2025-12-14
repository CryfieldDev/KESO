document.addEventListener('DOMContentLoaded', () => {
    loadReceivables();
});

// Variable global
let allDebts = [];

async function loadReceivables() {
    const container = document.getElementById('receivables-list');
    const totalDisplay = document.getElementById('total-pending');
    
    try {
        const res = await fetch(`${window.API_URL}/receivables`); 
        allDebts = await res.json();
        
        // Calcular total
        const totalAmount = allDebts.reduce((acc, debt) => acc + parseFloat(debt.monto), 0);
        totalDisplay.innerText = `$${totalAmount.toFixed(2)}`;

        container.innerHTML = '';
        
        if (allDebts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; color:#999; margin-top:50px;">
                    <i class="fas fa-glass-cheers" style="font-size:3em; color:#ddd; margin-bottom:15px;"></i>
                    <br>¡Todo al día! No hay cuentas por cobrar.
                </div>`;
            return;
        }

        allDebts.forEach(debt => {
            const card = document.createElement('div');
            card.className = 'receivable-card';
            
            const fecha = new Date(debt.fecha).toLocaleDateString();
            const numOrden = debt.Sale ? debt.Sale.numero_orden : '---';
            
            // ============================================================
            // GENERADOR WHATSAPP — SOLUCIÓN DEFINITIVA (SIN UNICODE)
            // ============================================================
            let btnWhatsapp = '';
            if (debt.telefono) {

                // Emojis codificados manualmente (no dependen de UTF-8)
                const EMOJI = {
                    factura: '%F0%9F%A7%BE',    // 🧾
                    calendario: '%F0%9F%93%85', // 📅
                    papel: '%F0%9F%93%84',      // 📄
                    dinero: '%F0%9F%92%B0'      // 💰
                };

                const productosLista = debt.Sale && debt.Sale.productos 
                    ? debt.Sale.productos.map(p => `• ${p.cantidad} ${p.nombre}`).join('\n')
                    : 'Detalles en nota física';

                // Mensaje SIN emojis
                const textMsg =
`*AVISO DE COBRO - KESO*

Estimado(a) *${debt.cliente}*, recordatorio de pago pendiente:

Fecha: ${fecha}
Orden: ${numOrden}

*DETALLE:*
${productosLista}

*TOTAL A PAGAR: $${parseFloat(debt.monto).toFixed(2)}*

Agradecemos su pago.`;

                // Solo el texto se codifica
                let encodedMsg = encodeURIComponent(textMsg);

                // Insertar emojis ya codificados
                encodedMsg =
                    `${EMOJI.factura}%20` + encodedMsg
                        .replace('Fecha%3A', `${EMOJI.calendario}%20Fecha:`)
                        .replace('Orden%3A', `${EMOJI.papel}%20Orden:`)
                        .replace('*TOTAL%20A%20PAGAR', `${EMOJI.dinero}%20*TOTAL A PAGAR`);

                const cleanPhone = debt.telefono.replace(/[^0-9]/g, '');
                const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

                btnWhatsapp = `
                    <a href="${url}" target="_blank"
                       class="btn-icon"
                       style="background:#25D366; color:white; padding:8px 12px; border-radius:6px; margin-right:5px; text-decoration:none; display:inline-flex; align-items:center;"
                       title="Enviar cobro por WhatsApp">
                        <i class="fab fa-whatsapp" style="font-size:1.2em;"></i>
                    </a>
                `;
            }
            // ============================================================

            card.innerHTML = `
                <div class="debt-info">
                    <h4><i class="fas fa-user" style="color:#FFB74D;"></i> ${debt.cliente}</h4>
                    <p style="font-weight: bold; color: #555;">Orden: ${numOrden}</p>
                    <p style="font-size: 0.85em; color: #888;">
                        <i class="far fa-calendar-alt"></i> ${fecha} 
                        ${debt.telefono ? '<br><i class="fas fa-phone-alt"></i> ' + debt.telefono : ''}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8em; color: #777; margin-bottom: 2px;">POR COBRAR</div>
                    <div class="debt-amount" style="color:#D32F2F; font-size:1.5em; font-weight:bold;">
                        $${parseFloat(debt.monto).toFixed(2)}
                    </div>
                    
                    <div style="margin-top: 12px; display:flex; gap:5px; justify-content:flex-end;">
                        ${btnWhatsapp}
                        <button onclick="printReminder('${debt.id}')" class="btn-icon"
                            style="background:#607D8B; color:white; padding:8px 12px; border-radius:6px; border:none; cursor:pointer;"
                            title="Imprimir Ticket Físico">
                            <i class="fas fa-print"></i>
                        </button>
                        <button onclick="markAsPaid('${debt.id}', '${debt.cliente}', '${debt.monto}')"
                            class="btn-icon"
                            style="background:#4CAF50; color:white; padding:8px 12px; border-radius:6px; border:none; cursor:pointer;"
                            title="Confirmar Pago">
                            <i class="fas fa-check"></i> Pagado
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align:center; color:red;">Error de conexión con el servidor.</div>';
    }
}

// === 2. FUNCIÓN PARA IMPRIMIR TICKET FÍSICO ===
window.printReminder = (id) => {
    const debt = allDebts.find(d => d.id == id);
    if (!debt) return;

    const fechaHoy = new Date().toLocaleDateString('es-ES');
    const items = (debt.Sale && debt.Sale.productos) ? debt.Sale.productos : [];
    
    let itemsHTML = '';
    items.forEach(p => {
        itemsHTML += `
            <div style="display:flex; justify-content:space-between; font-size:0.9em; margin-bottom:5px;">
                <span>${p.cantidad} x ${p.nombre}</span>
                <span>$${parseFloat(p.subtotal).toFixed(2)}</span>
            </div>
        `;
    });

    let area = document.getElementById('ticket-print-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'ticket-print-area';
        document.body.appendChild(area);
        const style = document.createElement('style');
        style.innerHTML = `
            @media print { 
                body * { visibility: hidden; } 
                #ticket-print-area { display: block !important; visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; } 
                #ticket-print-area * { visibility: visible !important; } 
            }
        `;
        document.head.appendChild(style);
    }
    
    area.innerHTML = `
        <div style="font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; color: black; text-align:center;">
            <h2 style="margin:0; font-size: 1.2em;">AVISO DE COBRO</h2>
            <p style="margin:5px 0 10px 0; font-size: 0.9em;">KESO SYSTEM</p>
            <div style="border: 2px solid #000; padding: 5px; margin-bottom: 15px; font-weight:bold;">RECORDATORIO DE PAGO</div>
            <div style="text-align:left; font-size:0.85em; margin-bottom:10px; line-height: 1.4;">
                <strong>Cliente:</strong> ${debt.cliente}<br>
                <strong>Teléfono:</strong> ${debt.telefono || '---'}<br>
                <strong>Fecha Emisión:</strong> ${fechaHoy}<br>
                <strong>Orden Ref:</strong> ${debt.Sale ? debt.Sale.numero_orden : '---'}
            </div>
            <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:10px 0; margin-bottom:10px; text-align:left;">
                ${itemsHTML || 'Detalle no disponible'}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:1.2em; font-weight:bold; margin-top:5px;">
                <span>TOTAL A PAGAR:</span>
                <span>$${parseFloat(debt.monto).toFixed(2)}</span>
            </div>
            <p style="margin-top:20px; font-size:0.7em;">*** Por favor, realice su pago ***</p>
        </div>
    `;

    const originalTitle = document.title;
    document.title = "Aviso_Cobro";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 300);
};

// === 3. FUNCIÓN PARA MARCAR COMO PAGADO ===
window.markAsPaid = async (id, cliente, monto) => {
    const confirmFunc = typeof showConfirm === 'function' ? showConfirm : confirm;
    const ok = await confirmFunc(`¿Confirmar que ${cliente} pagó la deuda de $${monto}?`);
    
    if (ok) {
        try {
            const res = await fetch(`${window.API_URL}/receivables/${id}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if(res.ok) {
                if(window.showToast) showToast('¡Pago registrado correctamente!', 'success');
                loadReceivables();
            } else {
                if(window.showToast) showToast('Error al registrar pago', 'error');
            }
        } catch (e) { 
            console.error(e);
            if(window.showToast) showToast('Error de conexión', 'error'); 
        }
    }
};
