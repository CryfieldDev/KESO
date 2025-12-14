// =========================================================
// CONFIGURACIÓN INICIAL
// =========================================================
document.getElementById('invoice-date').innerText = new Date().toLocaleDateString();
const currentUser = localStorage.getItem('keso_user') || 'Vendedor';
document.getElementById('invoice-seller').innerText = currentUser;

const productInput = document.getElementById('product-search');
const searchDropdown = document.getElementById('search-dropdown');
const qtyInput = document.getElementById('sale-qty');
const btnAdd = document.getElementById('btn-add-cart');
const cartContainer = document.getElementById('cart-items');
const totalDisplay = document.getElementById('cart-total');
const subtotalDisplay = document.getElementById('cart-subtotal');
const btnCheckout = document.getElementById('btn-checkout');
const btnCloseSelection = document.getElementById('btn-close-selection');

// Elementos nuevos para Crédito/Teléfono
const conditionSelect = document.getElementById('sale-condition');
const phoneInput = document.getElementById('client-phone'); // Ahora apuntamos directo al input

let allProducts = [];
let cart = [];
let selectedProduct = null;

// Cargar productos al iniciar
loadProductsData();

async function loadProductsData() {
    try {
        const res = await fetch(`${window.API_URL}/inventario`);
        const data = await res.json();
        // Ordenar alfabéticamente
        allProducts = data.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (e) { 
        if(window.showToast) showToast('Error cargando productos', 'error'); 
    }
}

// =========================================================
// BUSCADOR Y SELECCIÓN DE PRODUCTOS
// =========================================================
function renderProductList(products) {
    searchDropdown.innerHTML = '';
    
    if (products.length > 0) {
        searchDropdown.classList.add('active');
        searchDropdown.style.display = 'block';

        const listToShow = products.slice(0, 50); 

        listToShow.forEach(p => {
            const div = document.createElement('div');
            div.style.display = 'flex'; 
            div.style.alignItems = 'center'; 
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee'; 
            div.style.cursor = 'pointer'; 
            div.style.background = 'white';

            const imgUrl = p.imagen ? p.imagen : '/img/logo1.svg';
            div.innerHTML = `
                <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 15px; border: 1px solid #ddd;">
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 15px; color: #333;">${p.nombre}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">Stock: ${p.cantidad} ${p.unidad || ''}</p>
                </div>
                <div style="font-weight: bold; color: #0047c0; font-size: 1.1em;">$${Number(p.precio_venta).toFixed(2)}</div>
            `;
            
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                selectProduct(p);
            });
            div.onmouseover = function() { this.style.backgroundColor = '#f0f8ff'; };
            div.onmouseout = function() { this.style.backgroundColor = 'white'; };

            searchDropdown.appendChild(div);
        });
    } else {
        searchDropdown.classList.add('active');
        searchDropdown.style.display = 'block';
        searchDropdown.innerHTML = '<div style="padding:15px; text-align:center; color:#999;">No encontrado</div>';
    }
}

function openFullList() {
    if (productInput.value.trim() === '') {
        renderProductList(allProducts);
    }
}

// Eventos del Buscador
productInput.addEventListener('focus', openFullList);
productInput.addEventListener('click', (e) => {
    e.stopPropagation();
    openFullList();
});
productInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term.length === 0) { renderProductList(allProducts); return; }
    const matches = allProducts.filter(p => p.nombre.toLowerCase().includes(term) || (p.categoria && p.categoria.toLowerCase().includes(term)));
    renderProductList(matches);
});

// Cerrar buscador al hacer click fuera
document.addEventListener('click', (e) => {
    if (!productInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('active');
        searchDropdown.style.display = 'none';
    }
});

function selectProduct(product) {
    selectedProduct = product;
    productInput.value = ''; 
    searchDropdown.classList.remove('active');
    searchDropdown.style.display = 'none';
    
    document.getElementById('selected-product-info').style.display = 'block';
    document.getElementById('info-nombre').innerText = product.nombre;
    document.getElementById('info-cat').innerText = product.categoria || 'General';
    document.getElementById('info-stock').innerText = product.cantidad;
    document.getElementById('info-unidad-txt').innerText = product.unidad;
    document.getElementById('info-precio').innerText = `$${Number(product.precio_venta).toFixed(2)}`;
    document.getElementById('info-img').src = product.imagen ? product.imagen : '/img/logo1.svg';
    
    qtyInput.value = '';
    qtyInput.focus();
}

// Botón X para cerrar selección
if(btnCloseSelection) {
    btnCloseSelection.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedProduct = null;
        document.getElementById('selected-product-info').style.display = 'none'; 
        qtyInput.value = '';
        productInput.value = '';
        productInput.focus();
        renderProductList(allProducts); 
    });
}

// =========================================================
// CARRITO DE COMPRAS
// =========================================================

btnAdd.addEventListener('click', () => {
    if (!selectedProduct) return showToast('Selecciona un producto primero', 'warning');
    const qty = parseFloat(qtyInput.value);
    if (!qty || qty <= 0) return showToast('Ingresa una cantidad válida', 'warning');
    
    const prodId = selectedProduct.id || selectedProduct._id;
    const existingItem = cart.find(item => item.id === prodId);
    const currentQty = existingItem ? existingItem.cantidad : 0;
    const stockDisponible = Number(selectedProduct.cantidad);

    if ((currentQty + qty) > stockDisponible) return showToast(`Stock insuficiente. Quedan ${stockDisponible}`, 'error');

    if (existingItem) {
        existingItem.cantidad += qty;
        existingItem.subtotal = existingItem.cantidad * existingItem.precio;
    } else {
        cart.push({
            id: prodId,
            nombre: selectedProduct.nombre,
            cantidad: qty,
            precio: Number(selectedProduct.precio_venta),
            unidad: selectedProduct.unidad,
            imagen: selectedProduct.imagen ? selectedProduct.imagen : '/img/logo1.svg',
            subtotal: qty * Number(selectedProduct.precio_venta)
        });
    }
    renderCart();
    
    // Resetear selección
    qtyInput.value = ''; selectedProduct = null;
    document.getElementById('selected-product-info').style.display = 'none';
    productInput.value = '';
    productInput.focus();
    renderProductList(allProducts);
});

function renderCart() {
    cartContainer.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartContainer.innerHTML = `<div style="text-align:center; color:#bbb; margin-top:40px;">Carrito Vacío</div>`;
        totalDisplay.innerText = '$0.00'; subtotalDisplay.innerText = '$0.00'; return;
    }
    cart.forEach((item, index) => {
        total += item.subtotal;
        const div = document.createElement('div');
        div.className = 'item-row';
        const qtyTxt = item.unidad === 'kg' ? item.cantidad.toFixed(3) : item.cantidad;
        div.innerHTML = `
            <img src="${item.imagen}" class="cart-thumb">
            <div style="flex-grow:1;">
                <div style="font-weight:bold; color:#333;">${item.nombre}</div>
                <div style="font-size:0.85em; color:#666;">${qtyTxt} ${item.unidad} x $${item.precio.toFixed(2)}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold; color:var(--color-principal-azul);">$${item.subtotal.toFixed(2)}</div>
                <i class="fas fa-times" style="color:#e57373; cursor:pointer;" onclick="removeFromCart(${index})"></i>
            </div>`;
        cartContainer.appendChild(div);
    });
    totalDisplay.innerText = `$${total.toFixed(2)}`;
    subtotalDisplay.innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = (index) => { cart.splice(index, 1); renderCart(); };

// =========================================================
// LÓGICA DE CRÉDITO Y CHECKOUT
// =========================================================

// 1. Mostrar/Ocultar campo de teléfono
if(conditionSelect && phoneInput) {
    conditionSelect.addEventListener('change', (e) => {
        if (e.target.value === 'credito') {
            phoneInput.style.display = 'block';
            setTimeout(() => {
                phoneInput.focus();
            }, 100);
        } else {
            phoneInput.style.display = 'none';
            phoneInput.value = ''; // Limpiar si se arrepiente
        }
    });
}

// 2. PROCESAR VENTA (CHECKOUT)
btnCheckout.addEventListener('click', async () => {
    if (cart.length === 0) return showToast('Carrito vacío', 'warning');
    
    // Obtener valores del formulario
    const saleCondition = conditionSelect.value; // 'contado' o 'credito'
    const clientName = document.getElementById('client-name').value || 'Consumidor Final';
    const totalStr = totalDisplay.innerText;
    
    // CAPTURAR TELÉFONO
    let clientPhone = '';
    if(phoneInput && phoneInput.style.display !== 'none') {
        clientPhone = phoneInput.value;
    }

    // VALIDACIÓN IMPORTANTE: Si es crédito, EXIGIR nombre
    if (saleCondition === 'credito' && (clientName.trim() === '' || clientName === 'Consumidor Final')) {
        return showToast('⚠️ Para dar crédito debes escribir el Nombre del Cliente', 'warning');
    }

    // Mensaje de confirmación dinámico
    let confirmMsg = `¿Procesar venta por ${totalStr}?`;
    if (saleCondition === 'credito') {
        confirmMsg = `¿Registrar DEUDA a ${clientName} por ${totalStr}?`;
    }

    const ok = typeof showConfirm === 'function' ? await showConfirm(confirmMsg) : confirm(confirmMsg);
    
    if (ok) {
        const saleData = {
            productos: cart.map(i => ({ 
                nombre: i.nombre, 
                cantidad: i.cantidad, 
                precio_unitario: i.precio, 
                subtotal: i.subtotal, 
                unidad: i.unidad 
            })),
            total: parseFloat(totalStr.replace('$', '')),
            vendedor: currentUser,
            cliente: clientName,
            
            // DATOS PARA CRÉDITO/DEUDA
            condicion: saleCondition, 
            estado: saleCondition === 'credito' ? 'pendiente' : 'pagado',
            telefono: clientPhone // <--- AQUÍ SE ENVÍA EL TELÉFONO
        };

        try {
            const res = await fetch(`${window.API_URL}/sales`, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(saleData)
            });
            const data = await res.json();
            
            if (res.ok) {
                if (saleCondition === 'credito') {
                    showToast(`✅ Crédito registrado: ${data.orden}`, 'info');
                } else {
                    showToast(`✅ Venta Exitosa: ${data.orden}`, 'success');
                }
                
                // LIMPIEZA COMPLETA
                cart = []; 
                renderCart(); 
                
                document.getElementById('client-name').value = '';
                if(phoneInput) {
                    phoneInput.value = '';
                    phoneInput.style.display = 'none';
                }
                
                conditionSelect.value = 'contado';
                
                loadProductsData(); // Recargar inventario
            } else {
                showToast(data.message || 'Error al procesar venta', 'error');
            }
        } catch (e) { 
            console.error(e);
            showToast('Error de conexión con el servidor', 'error'); 
        }
    }
});