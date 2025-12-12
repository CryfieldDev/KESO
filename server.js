const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');

// Configuración de Entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. CONEXIÓN A BASE DE DATOS (MYSQL)
// ==========================================
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST || 'localhost', // Cambia esto si tu hosting te da una IP específica
        dialect: 'mysql',
        logging: false, // Para no llenar la consola de texto SQL
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// ==========================================
// 2. DEFINICIÓN DE MODELOS (TABLAS)
// ==========================================

// Usuario
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'user' }
});

// Producto (Inventario)
const Product = sequelize.define('Product', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    cantidad: { type: DataTypes.INTEGER, defaultValue: 0 },
    unidad: { type: DataTypes.STRING, defaultValue: 'und' },
    precio_compra: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    precio_venta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    categoria: { type: DataTypes.STRING },
    // IMPORTANTE: LONGTEXT permite guardar strings muy largos (Base64)
    imagen: { type: DataTypes.TEXT('long') }, 
    fecha_registro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Venta (Cabecera)
const Sale = sequelize.define('Sale', {
    numero_orden: { type: DataTypes.STRING },
    total: { type: DataTypes.DECIMAL(10, 2) },
    vendedor: { type: DataTypes.STRING },
    cliente: { type: DataTypes.STRING },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Venta (Detalle de Productos) - NUEVO POR SER SQL
const SaleItem = sequelize.define('SaleItem', {
    nombre: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.INTEGER },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2) },
    subtotal: { type: DataTypes.DECIMAL(10, 2) }
});

// Gasto
const Expense = sequelize.define('Expense', {
    concepto: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria: { type: DataTypes.STRING, defaultValue: 'General' },
    tipo: { type: DataTypes.STRING, defaultValue: 'Variable' },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Relaciones (Foreign Keys)
Sale.hasMany(SaleItem, { as: 'productos', foreignKey: 'saleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Archivos Estáticos
app.use(express.static(path.join(__dirname, '/')));
app.use('/register', express.static(path.join(__dirname, 'register')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
app.use('/inventory', express.static(path.join(__dirname, 'inventory')));
app.use('/billing', express.static(path.join(__dirname, 'billing')));
app.use('/sales', express.static(path.join(__dirname, 'sales')));
app.use('/expenses', express.static(path.join(__dirname, 'expenses')));

// Sincronizar Base de Datos
console.log("⏳ Conectando a MySQL...");
sequelize.sync({ alter: true }) // 'alter: true' actualiza las tablas si cambias algo
    .then(() => console.log('✅ BASE DE DATOS MYSQL CONECTADA Y SINCRONIZADA'))
    .catch(err => console.error('❌ ERROR CONEXIÓN:', err.message));


// ==========================================
// 4. RUTAS API (REESCRITAS PARA SQL)
// ==========================================

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user || user.password !== password) return res.status(401).json({ message: 'Credenciales inválidas' });
        return res.status(200).json({ success: true, user: { username: user.username } });
    } catch (e) { res.status(500).json({ message: 'Error interno' }); }
});

app.post('/api/register', async (req, res) => {
    try {
        await User.create(req.body);
        res.status(201).json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Error registro' }); }
});

// --- VENTAS (COMPLEJO: TRANSACCIÓN) ---
app.post('/api/sales', async (req, res) => {
    const { productos, total, vendedor, cliente } = req.body;
    const t = await sequelize.transaction(); // Iniciar transacción segura

    try {
        // 1. Generar número de orden
        const count = await Sale.count({ transaction: t });
        const numeroOrden = `ORD-${String(count + 1).padStart(4, '0')}`;

        // 2. Crear la Venta (Cabecera)
        const nuevaVenta = await Sale.create({
            numero_orden: numeroOrden,
            total,
            vendedor,
            cliente
        }, { transaction: t });

        // 3. Procesar Productos
        for (const item of productos) {
            // Verificar Stock
            const prod = await Product.findOne({ where: { nombre: item.nombre }, transaction: t });
            if (!prod || prod.cantidad < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${item.nombre}`);
            }

            // Restar Stock
            await prod.decrement('cantidad', { by: item.cantidad, transaction: t });

            // Crear el Item de Venta vinculado
            await SaleItem.create({
                saleId: nuevaVenta.id, // Enlace SQL
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio_unitario: item.precio || 0, // Asegúrate de enviar precio desde el frontend
                subtotal: item.subtotal || 0
            }, { transaction: t });
        }

        await t.commit(); // Guardar todo
        res.status(201).json({ success: true, orden: numeroOrden });

    } catch (error) {
        await t.rollback(); // Deshacer si algo falla
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        // En SQL debemos pedir explícitamente incluir los productos
        const sales = await Sale.findAll({
            include: [{ model: SaleItem, as: 'productos' }],
            order: [['fecha', 'DESC']]
        });
        res.json(sales);
    } catch (e) { res.status(500).json({ message: 'Error ventas' }); }
});

// --- GASTOS ---
app.post('/api/expenses', async (req, res) => {
    try {
        const newExpense = await Expense.create(req.body);
        res.status(201).json(newExpense);
    } catch (e) { res.status(500).json({ message: 'Error al guardar gasto' }); }
});

app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.findAll({ order: [['fecha', 'DESC']] });
        res.json(expenses);
    } catch (e) { res.status(500).json({ message: 'Error al obtener gastos' }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const deleted = await Expense.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Gasto eliminado' });
    } catch (e) { res.status(500).json({ message: 'Error al eliminar' }); }
});

// --- FINANZAS (REPORTES) ---
app.post('/api/finance-range', async (req, res) => {
    const { startDate, endDate } = req.body;
    const { Op } = require('sequelize');
    
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Consultas SQL con rango de fechas
        const sales = await Sale.findAll({
            where: { fecha: { [Op.between]: [start, end] } }
        });
        const expenses = await Expense.findAll({
            where: { fecha: { [Op.between]: [start, end] } }
        });

        // Cálculos (Igual que antes, JS se encarga)
        const totalIngresos = sales.reduce((acc, curr) => acc + Number(curr.total), 0);
        const totalGastos = expenses.reduce((acc, curr) => acc + Number(curr.monto), 0);
        const balance = totalIngresos - totalGastos;

        const gastosFijos = expenses.filter(e => e.tipo === 'Fijo').reduce((a, c) => a + Number(c.monto), 0);
        const gastosVariables = expenses.filter(e => e.tipo === 'Variable').reduce((a, c) => a + Number(c.monto), 0);

        res.json({ totalIngresos, totalGastos, balance, gastosFijos, gastosVariables, listaGastos: expenses });
    } catch (e) { res.status(500).json({ message: 'Error finanzas' }); }
});

app.get('/api/finance-summary', async (req, res) => {
    try {
        const totalIngresos = await Sale.sum('total') || 0;
        const totalGastos = await Expense.sum('monto') || 0;
        res.json({ 
            totalIngresos: totalIngresos, 
            totalGastos: totalGastos, 
            balance: totalIngresos - totalGastos 
        });
    } catch (e) { res.status(500).json({ message: 'Error balance' }); }
});

// --- INVENTARIO (CRUD) ---
const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/inventario', async (req, res) => {
    try {
        const p = await Product.findAll({ order: [['fecha_registro', 'DESC']] });
        res.json(p);
    } catch(e){ res.status(500).send(); }
});

app.post('/api/inventario', upload.single('imagen'), async (req, res) => {
    try {
        const d = req.body;
        if(req.file) d.imagen = `data:${req.file.mimetype};base64,${Buffer.from(req.file.buffer).toString('base64')}`;
        else if(d.imagenExisting) d.imagen = d.imagenExisting;
        
        await Product.create(d);
        res.status(201).json({success:true});
    } catch(e){ console.log(e); res.status(400).send(); }
});

app.put('/api/inventario/:id', upload.single('imagen'), async (req, res) => {
    try {
        const d = req.body;
        if(req.file) d.imagen = `data:${req.file.mimetype};base64,${Buffer.from(req.file.buffer).toString('base64')}`;
        else if(d.imagenExisting) d.imagen = d.imagenExisting;
        
        await Product.update(d, { where: { id: req.params.id } });
        res.json({success:true});
    } catch(e){ res.status(500).send(); }
});

app.delete('/api/inventario/:id', async (req, res) => {
    try { 
        await Product.destroy({ where: { id: req.params.id } }); 
        res.json({msg:'Deleted'}); 
    } catch(e){ res.status(500).send(); }
});

app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const ps = await Product.findAll();
        // Nota: En SQL los números vienen como strings a veces, convertimos a Number
        const val = ps.reduce((a, p) => a + (Number(p.precio_compra) * p.cantidad), 0);
        const ven = ps.reduce((a, p) => a + (Number(p.precio_venta) * p.cantidad), 0);
        res.json({ totalProductos: ps.length, valorInventario: val.toFixed(2), gananciaEstimada: (ven - val).toFixed(2) });
    } catch(e){ res.status(500).send(); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 ZENTRO ONLINE (MySQL): http://localhost:${PORT}`));