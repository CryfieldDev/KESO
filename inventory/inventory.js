const form = document.getElementById('inventory-form');
const tableBody = document.getElementById('inventory-list');
const btnCancelar = document.getElementById('btn-cancelar');
const formTitle = document.getElementById('form-title');
const btnGuardar = document.getElementById('btn-guardar');

// Elementos Galería
const galleryModal = document.getElementById('gallery-modal');
const galleryGrid = document.getElementById('gallery-grid');
const existingImgInput = document.getElementById('imagen-existing');
const fileInput = document.getElementById('prod-imagen');
const previewContainer = document.getElementById('preview-container');
const imgPreviewMini = document.getElementById('img-preview-mini');
let tempSelectedImage = null;

const INVENTORY_URL = `${window.API_URL}/inventario`;

loadProducts();

async function loadProducts() {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">Cargando...</td></tr>';
    try {
        const res = await fetch(INVENTORY_URL);
        const products = await res.json();
        tableBody.innerHTML = '';
        if (products.length === 0) { tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">Sin productos.</td></tr>'; return; }

        products.forEach(prod => {
            // Aseguramos que los valores numéricos se traten como tales
            const pVenta = Number(prod.precio_venta);
            const pCompra = Number(prod.precio_compra);
            const pCantidad = Number(prod.cantidad);

            const ganancia = (pVenta - pCompra).toFixed(2);
            let badge = 'cat-otros';
            if (prod.categoria === 'Quesos') badge = 'cat-quesos';
            if (prod.categoria === 'Charcutería') badge = 'cat-charcuteria';
            if (prod.categoria === 'Lácteos') badge = 'cat-lacteos';

            const img = prod.imagen ? prod.imagen : '/img/KESO.png';
            const qty = prod.unidad === 'kg' ? pCantidad.toFixed(3) : Math.floor(pCantidad);
            const unit = prod.unidad === 'kg' ? 'Kg' : 'Und';

            const row = document.createElement('tr');
            // CAMBIO AQUÍ: prod.id en lugar de prod._id
            // CAMBIO AQUÍ: Eliminado .slice(-6) porque el ID de MySQL es corto (ej: 1, 15, 100)
            row.innerHTML = `
                <td><img src="${img}" class="product-thumb"></td>
                <td><div style="font-weight:bold; color:#333;">${prod.nombre}</div><div style="font-size:0.85em; color:#888;">ID: ${prod.id}</div></td>
                <td><span class="badge ${badge}">${prod.categoria}</span></td>
                <td><div style="font-weight: bold; color: ${pCantidad < 5 ? '#D32F2F' : '#333'}">${qty} <small>${unit}</small></div></td>
                <td>$${pCompra.toFixed(2)}</td>
                <td>$${pVenta.toFixed(2)}</td>
                <td style="color: #2e7d32; font-weight: bold;">+$${ganancia}</td>
                <td style="text-align: right;">
                    <button onclick="editProduct('${prod.id}')" style="cursor:pointer; border:none; background:#E3F2FD; color:#1565C0; padding:8px 12px; border-radius:6px; margin-right:5px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct('${prod.id}', '${prod.nombre}')" style="cursor:pointer; border:none; background:#FFEBEE; color:#C62828; padding:8px 12px; border-radius:6px;"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (e) { showToast('Error al cargar', 'error'); }
}

// LOGICA GALERIA
window.openImageGallery = async () => {
    const res = await fetch(INVENTORY_URL);
    const products = await res.json();
    const uniqueImages = new Set();
    const imagesToShow = [];

    products.forEach(p => {
        if (p.imagen && p.imagen.length > 50) {
            if (!uniqueImages.has(p.imagen)) { uniqueImages.add(p.imagen); imagesToShow.push(p.imagen); }
        }
    });

    galleryGrid.innerHTML = '';
    if (imagesToShow.length === 0) document.getElementById('gallery-empty').style.display = 'block';
    else {
        document.getElementById('gallery-empty').style.display = 'none';
        imagesToShow.forEach(imgSrc => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${imgSrc}">`;
            div.onclick = () => {
                document.querySelectorAll('.gallery-item').forEach(d => d.classList.remove('selected'));
                div.classList.add('selected');
                tempSelectedImage = imgSrc;
            };
            galleryGrid.appendChild(div);
        });
    }
    galleryModal.classList.add('show');
};

window.confirmGallerySelection = () => {
    if (tempSelectedImage) {
        existingImgInput.value = tempSelectedImage;
        fileInput.value = '';
        previewContainer.style.display = 'flex';
        imgPreviewMini.src = tempSelectedImage;
    }
    closeGallery();
};

window.closeGallery = () => { galleryModal.classList.remove('show'); tempSelectedImage = null; };
window.clearImageSelection = () => { existingImgInput.value = ''; previewContainer.style.display = 'none'; fileInput.value = ''; };
fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) { existingImgInput.value = ''; previewContainer.style.display = 'none'; } });

// GUARDAR
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const formData = new FormData();
    
    formData.append('nombre', document.getElementById('prod-nombre').value);
    formData.append('categoria', document.getElementById('prod-categoria').value);
    formData.append('unidad', document.getElementById('prod-unidad').value);
    formData.append('cantidad', document.getElementById('prod-cantidad').value);
    formData.append('precio_compra', document.getElementById('prod-precio-compra').value);
    formData.append('precio_venta', document.getElementById('prod-precio-venta').value);

    if (fileInput.files[0]) formData.append('imagen', fileInput.files[0]);
    else if (existingImgInput.value) formData.append('imagenExisting', existingImgInput.value);

    try {
        let response;
        if (id) response = await fetch(`${INVENTORY_URL}/${id}`, { method: 'PUT', body: formData });
        else response = await fetch(INVENTORY_URL, { method: 'POST', body: formData });

        if (response.ok) {
            showToast(id ? 'Actualizado' : 'Guardado', 'success');
            resetForm();
            loadProducts();
        } else { showToast('Error al guardar', 'error'); }
    } catch (error) { showToast('Error conexión', 'error'); }
});

window.editProduct = async (id) => {
    const res = await fetch(INVENTORY_URL);
    const products = await res.json();
    
    // CAMBIO AQUÍ: p.id == id (doble igual para permitir string vs number)
    const prod = products.find(p => p.id == id);
    
    if (prod) {
        // CAMBIO AQUÍ: prod.id
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-nombre').value = prod.nombre;
        document.getElementById('prod-categoria').value = prod.categoria;
        document.getElementById('prod-unidad').value = prod.unidad;
        document.getElementById('prod-cantidad').value = prod.cantidad;
        document.getElementById('prod-precio-compra').value = prod.precio_compra;
        document.getElementById('prod-precio-venta').value = prod.precio_venta;
        
        // Cargar imagen en preview si existe
        if(prod.imagen && prod.imagen.length > 50) {
            existingImgInput.value = prod.imagen;
            previewContainer.style.display = 'flex';
            imgPreviewMini.src = prod.imagen;
        } else {
            clearImageSelection();
        }

        formTitle.innerHTML = '<i class="fas fa-edit"></i> Editando Producto...';
        btnGuardar.innerHTML = 'Actualizar';
        btnGuardar.style.backgroundColor = '#FF9800'; 
        btnCancelar.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deleteProduct = async (id, nombre) => {
    const conf = await showConfirm(`¿Eliminar ${nombre}?`);
    if (conf) {
        try {
            const res = await fetch(`${INVENTORY_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) { showToast('Eliminado', 'success'); loadProducts(); }
            else showToast('Error', 'error');
        } catch (e) { showToast('Error', 'error'); }
    }
};

btnCancelar.addEventListener('click', resetForm);
function resetForm() {
    form.reset();
    document.getElementById('prod-id').value = '';
    clearImageSelection();
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Ingreso';
    btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar';
    btnGuardar.style.backgroundColor = '';
    btnCancelar.style.display = 'none';
}