const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { testConnection, isDbConnected } = require('./config/db');
const { isFirebaseConnected } = require('./config/firebase');
const leadRoutes = require('./routes/leadRoutes');
const authRoutes = require('./routes/authRoutes');
const { requireAdminAuthWeb } = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Seguridad con Helmet
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);

// Middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Servir archivos estáticos del frontend (landing page y assets)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api', leadRoutes);

// Endpoint de Salud / Diagnóstico del Backend
app.get('/api/health', (req, res) => {
    const firebaseActive = isFirebaseConnected();
    const mysqlActive = isDbConnected();

    res.json({
        status: 'online',
        service: 'Embudo y Mini-CRM Obra Blanca',
        database: {
            firebase_connected: firebaseActive,
            mysql_connected: mysqlActive,
            active_engine: firebaseActive ? 'firebase_firestore' : (mysqlActive ? 'mysql' : 'in_memory_fallback')
        },
        database_connected: firebaseActive || mysqlActive,
        timestamp: new Date().toISOString()
    });
});

// Ruta de Inicio de Sesión
app.get('/login', (req, res) => {
    // Si ya tiene cookie válida, redirigir directo al admin
    if (req.cookies && req.cookies.ob_auth_token) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Ruta del Panel de Administración y Mini-CRM (Protegida)
app.get('/admin', requireAdminAuthWeb, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Manejador de rutas no encontradas (404)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Endpoint no encontrado en la API.' });
    }
    // Para rutas web normales, redirigir a index.html
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error('🔥 Error no controlado:', err);
    res.status(500).json({
        success: false,
        error: 'Ocurrió un error interno en el servidor.'
    });
});

// Inicialización del servidor y prueba de base de datos
async function startServer() {
    await testConnection();

    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
        console.log(`📁 Frontend servido desde: ./public`);
        console.log(`🔒 Login en: http://localhost:${PORT}/login`);
        console.log(`🛡️ Admin protegido en: http://localhost:${PORT}/admin`);
        console.log(`======================================================\n`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = app;
