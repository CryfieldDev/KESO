const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Sequelize, DataTypes, Op } = require('sequelize');

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
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, 
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
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
    imagen: { type: DataTypes.TEXT('long') }, 
    fecha_registro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Venta
const Sale = sequelize.define('Sale', {
    numero_orden: { type: DataTypes.STRING },
    total: { type: DataTypes.DECIMAL(10, 2) },
    vendedor: { type: DataTypes.STRING },
    cliente: { type: DataTypes.STRING },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Venta Detalle
const SaleItem = sequelize.define('SaleItem', {
    nombre: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.INTEGER },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2) },
    subtotal: { type: DataTypes.DECIMAL(10, 2) }
});

// Cuentas Por Cobrar (Receivable)
const Receivable = sequelize.define('Receivable', {
    cliente: { type: DataTypes.STRING },
    telefono: { type: DataTypes.STRING },
    monto: { type: DataTypes.DECIMAL(10, 2) },
    estado: { type: DataTypes.STRING, defaultValue: 'pendiente' },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    
    // Campo saleId explícito
    saleId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

// Gasto
const Expense = sequelize.define('Expense', {
    concepto: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria: { type: DataTypes.STRING, defaultValue: 'General' },
    tipo: { type: DataTypes.STRING, defaultValue: 'Variable' },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- RELACIONES ---
Sale.hasMany(SaleItem, { as: 'productos', foreignKey: 'saleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

// Relación Venta <-> Deuda
Sale.hasOne(Receivable, { foreignKey: 'saleId' });
Receivable.belongsTo(Sale, { foreignKey: 'saleId' });


// ==========================================
// 3. INICIALIZACIÓN Y AUTO-CREACIÓN DE TABLAS
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '/')));
app.use('/receivables', express.static(path.join(__dirname, 'receivables')));

console.log("⏳ Conectando Base de Datos...");

// --- CORRECCIÓN FINAL ---
// Usamos .sync() vacío. 
// Esto significa: "Si las tablas existen, NO HAGAS NADA (respeta los datos)".
// "Si no existen, créalas".
sequelize.sync() 
    .then(() => console.log('✅ BASE DE DATOS MYSQL CONECTADA Y DATOS PERSISTENTES'))
    .catch(err => console.error('❌ ERROR CONEXIÓN:', err.message));


// ==========================================
// 4. RUTAS API
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

// --- VENTAS ---
app.post('/api/sales', async (req, res) => {
    const { productos, total, vendedor, cliente, condicion, telefono } = req.body;

    try {
        const t = await sequelize.transaction();

        try {
            const count = await Sale.count({ transaction: t });
            const numeroOrden = `ORD-${String(count + 1).padStart(4, '0')}`;

            // 1. Guardamos la Venta General
            const nuevaVenta = await Sale.create({
                numero_orden: numeroOrden,
                total,
                vendedor,
                cliente
            }, { transaction: t });

            // 2. SI ES CRÉDITO -> Guardamos en Receivable
            if (condicion === 'credito') {
                await Receivable.create({
                    saleId: nuevaVenta.id, 
                    cliente: cliente,
                    telefono: telefono,
                    monto: total,
                    estado: 'pendiente'
                }, { transaction: t });
            }

            // 3. Descontamos inventario
            for (const item of productos) {
                const prod = await Product.findOne({ where: { nombre: item.nombre }, transaction: t });
                if (!prod || prod.cantidad < item.cantidad) {
                    throw new Error(`Stock insuficiente para: ${item.nombre}`);
                }
                await prod.decrement('cantidad', { by: item.cantidad, transaction: t });

                await SaleItem.create({
                    saleId: nuevaVenta.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario || item.precio || 0,
                    subtotal: item.subtotal || 0
                }, { transaction: t });
            }

            await t.commit();
            res.status(201).json({ success: true, orden: numeroOrden });

        } catch (error) {
            await t.rollback();
            console.error("Error Transacción:", error);
            res.status(400).json({ message: error.message });
        }
    } catch (e) {
        console.error("Error General Venta:", e);
        res.status(500).json({ message: 'Error interno al procesar venta' });
    }
});

// --- VENTAS (OBTENER) ---
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await Sale.findAll({
            include: [
                { model: SaleItem, as: 'productos' },
                { model: Receivable }
            ],
            order: [['fecha', 'DESC']]
        });
        res.json(sales);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Error obteniendo ventas' }); 
    }
});

// --- POR COBRAR (RECEIVABLES) ---
app.get('/api/receivables', async (req, res) => {
    try {
        const debts = await Receivable.findAll({
            where: { estado: 'pendiente' },
            include: [{ 
                model: Sale, 
                required: false,
                include: [{model: SaleItem, as: 'productos'}] 
            }], 
            order: [['fecha', 'DESC']]
        });
        res.json(debts);
    } catch (e) { 
        console.error("Error en GET /receivables:", e);
        res.status(500).json({ message: 'Error obteniendo deudas', error: e.message }); 
    }
});

app.put('/api/receivables/:id', async (req, res) => {
    try {
        await Receivable.update({ estado: 'pagado' }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Error al actualizar deuda' }); }
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

// --- FINANZAS ---
app.post('/api/finance-range', async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Total Ventas (Bruto)
        const sales = await Sale.findAll({ where: { fecha: { [Op.between]: [start, end] } } });
        const totalVentasBruto = sales.reduce((acc, curr) => acc + Number(curr.total), 0);

        // 2. Restar Pendientes
        const pending = await Receivable.findAll({ 
            where: { 
                fecha: { [Op.between]: [start, end] },
                estado: 'pendiente'
            }
        });
        const totalPorCobrar = pending.reduce((acc, curr) => acc + Number(curr.monto), 0);

        // Ingreso Real
        const totalIngresos = totalVentasBruto - totalPorCobrar;

        // 3. Gastos
        const expenses = await Expense.findAll({ where: { fecha: { [Op.between]: [start, end] } } });
        const totalGastos = expenses.reduce((acc, curr) => acc + Number(curr.monto), 0);
        
        const balance = totalIngresos - totalGastos;
        const gastosFijos = expenses.filter(e => e.tipo === 'Fijo').reduce((a, c) => a + Number(c.monto), 0);
        const gastosVariables = expenses.filter(e => e.tipo === 'Variable').reduce((a, c) => a + Number(c.monto), 0);

        res.json({ totalIngresos, totalGastos, balance, gastosFijos, gastosVariables, listaGastos: expenses });
    } catch (e) { res.status(500).json({ message: 'Error finanzas' }); }
});

app.get('/api/finance-summary', async (req, res) => {
    try {
        const totalVentas = await Sale.sum('total') || 0;
        const totalDeuda = await Receivable.sum('monto', { where: { estado: 'pendiente' } }) || 0;
        const totalIngresos = totalVentas - totalDeuda;
        
        const totalGastos = await Expense.sum('monto') || 0;
        
        res.json({ 
            totalIngresos: totalIngresos, 
            totalGastos: totalGastos, 
            balance: totalIngresos - totalGastos 
        });
    } catch (e) { res.status(500).json({ message: 'Error balance' }); }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const ps = await Product.findAll();
        const inversion = ps.reduce((a, p) => a + (Number(p.precio_compra) * p.cantidad), 0);
        const ventaTotal = ps.reduce((a, p) => a + (Number(p.precio_venta) * p.cantidad), 0);
        const ganancia = ventaTotal - inversion;

        const deudas = await Receivable.findAll({ where: { estado: 'pendiente' } });
        const totalDeuda = deudas.reduce((acc, d) => acc + Number(d.monto), 0);

        res.json({ 
            valorInventario: inversion.toFixed(2), 
            gananciaEstimada: ganancia.toFixed(2),
            porCobrar: totalDeuda.toFixed(2)
        });
    } catch(e){ 
        console.error(e);
        res.status(500).send(); 
    }
});

// --- INVENTARIO ---
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
        await Product.create(d); res.status(201).json({success:true});
    } catch(e){ console.log(e); res.status(400).send(); }
});

app.put('/api/inventario/:id', upload.single('imagen'), async (req, res) => {
    try {
        const d = req.body;
        if(req.file) d.imagen = `data:${req.file.mimetype};base64,${Buffer.from(req.file.buffer).toString('base64')}`;
        else if(d.imagenExisting) d.imagen = d.imagenExisting;
        await Product.update(d, { where: { id: req.params.id } }); res.json({success:true});
    } catch(e){ res.status(500).send(); }
});

app.delete('/api/inventario/:id', async (req, res) => {
    try { 
        await Product.destroy({ where: { id: req.params.id } }); res.json({msg:'Deleted'}); 
    } catch(e){ res.status(500).send(); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 ZENTRO ONLINE (MySQL): http://localhost:${PORT}`));

