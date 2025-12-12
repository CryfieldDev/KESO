// Configuración Inicial
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

let allProducts = [];
let cart = [];
let selectedProduct = null;

loadProductsData();

async function loadProductsData() {
    try {
        const res = await fetch(`${window.API_URL}/inventario`);
        allProducts = await res.json();
    } catch (e) { showToast('Error cargando productos', 'error'); }
}

// BUSCADOR
productInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    searchDropdown.innerHTML = ''; 
    if (term.length === 0) { searchDropdown.classList.remove('active'); return; }

    const matches = allProducts.filter(p => 
        p.nombre.toLowerCase().includes(term) || (p.categoria && p.categoria.toLowerCase().includes(term))
    );

    if (matches.length > 0) {
        searchDropdown.classList.add('active');
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            const imgUrl = p.imagen ? p.imagen : '/img/KESO.png';
            div.innerHTML = `<img src="${imgUrl}" class="search-thumb"><div class="search-info"><h4>${p.nombre}</h4><p>Stock: ${p.cantidad}</p></div><div class="search-price">$${p.precio_venta}</div>`;
            div.addEventListener('click', () => selectProduct(p));
            searchDropdown.appendChild(div);
        });
    } else {
        searchDropdown.classList.add('active');
        searchDropdown.innerHTML = '<div class="no-results">No encontrado</div>';
    }
});

function selectProduct(product) {
    selectedProduct = product;
    productInput.value = product.nombre;
    searchDropdown.classList.remove('active');
    document.getElementById('selected-product-info').style.display = 'block';
    document.getElementById('info-nombre').innerText = product.nombre;
    document.getElementById('info-cat').innerText = product.categoria || 'General';
    document.getElementById('info-stock').innerText = product.cantidad;
    document.getElementById('info-unidad-txt').innerText = product.unidad;
    document.getElementById('info-precio').innerText = `$${product.precio_venta}`;
    document.getElementById('info-img').src = product.imagen ? product.imagen : '/img/KESO.png';
    qtyInput.value = '';
    qtyInput.focus();
}

document.addEventListener('click', (e) => {
    if (!productInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('active');
    }
});

// AGREGAR AL CARRITO
btnAdd.addEventListener('click', () => {
    if (!selectedProduct) return showToast('Selecciona un producto', 'warning');
    const qty = parseFloat(qtyInput.value);
    if (!qty || qty <= 0) return showToast('Cantidad inválida', 'warning');
    
    // CAMBIO AQUÍ: selectedProduct.id en lugar de ._id
    const existingItem = cart.find(item => item.id === selectedProduct.id);
    
    const currentQty = existingItem ? existingItem.cantidad : 0;
    // Nos aseguramos de tratar la cantidad como número
    const stockDisponible = Number(selectedProduct.cantidad);

    if ((currentQty + qty) > stockDisponible) return showToast(`Stock insuficiente. Quedan ${stockDisponible}`, 'error');

    if (existingItem) {
        existingItem.cantidad += qty;
        existingItem.subtotal = existingItem.cantidad * existingItem.precio;
    } else {
        cart.push({
            // CAMBIO AQUÍ: selectedProduct.id en lugar de ._id
            id: selectedProduct.id,
            nombre: selectedProduct.nombre,
            cantidad: qty,
            precio: Number(selectedProduct.precio_venta),
            unidad: selectedProduct.unidad,
            imagen: selectedProduct.imagen ? selectedProduct.imagen : '/img/KESO.png',
            subtotal: qty * Number(selectedProduct.precio_venta)
        });
    }
    renderCart();
    productInput.value = ''; qtyInput.value = ''; selectedProduct = null;
    document.getElementById('selected-product-info').style.display = 'none';
    productInput.focus();
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
        div.innerHTML = `<img src="${item.imagen}" class="cart-thumb"><div style="flex-grow:1;"><div style="font-weight:bold; color:#333;">${item.nombre}</div><div style="font-size:0.85em; color:#666;">${qtyTxt} ${item.unidad} x $${item.precio}</div></div><div style="text-align:right;"><div style="font-weight:bold; color:var(--color-principal-azul);">$${item.subtotal.toFixed(2)}</div><i class="fas fa-times" style="color:#e57373; cursor:pointer;" onclick="removeFromCart(${index})"></i></div>`;
        cartContainer.appendChild(div);
    });
    totalDisplay.innerText = `$${total.toFixed(2)}`;
    subtotalDisplay.innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = (index) => { cart.splice(index, 1); renderCart(); };

// CHECKOUT (CONFIRMAR VENTA)
btnCheckout.addEventListener('click', async () => {
    if (cart.length === 0) return showToast('Carrito vacío', 'warning');
    const totalStr = totalDisplay.innerText;
    const ok = await showConfirm(`¿Procesar venta por ${totalStr}?`);
    
    if (ok) {
        const saleData = {
            productos: cart.map(i => ({ 
                nombre: i.nombre, 
                cantidad: i.cantidad, 
                precio_unitario: i.precio, // Aseguramos enviar el precio unitario para SQL
                subtotal: i.subtotal, 
                unidad: i.unidad 
            })),
            total: parseFloat(totalStr.replace('$', '')),
            vendedor: currentUser,
            cliente: document.getElementById('client-name').value || 'Consumidor Final'
        };

        try {
            const res = await fetch(`${window.API_URL}/sales`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(saleData)
            });
            const data = await res.json();
            
            if (res.ok) {
                // AQUÍ MOSTRAMOS EL NÚMERO DE ORDEN
                showToast(`✅ Venta Exitosa: ${data.orden}`, 'success');
                cart = []; renderCart(); document.getElementById('client-name').value = '';
                loadProductsData();
            } else {
                showToast(data.message, 'error');
            }
        } catch (e) { showToast('Error de conexión', 'error'); }
    }
});