const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { testConnection, isDbConnected } = require('./config/db');
const { isFirebaseConnected } = require('./config/firebase');
const leadRoutes = require('./routes/leadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Seguridad con Helmet (Permitiendo recursos multimedia y fuentes)
app.use(
    helmet({
        contentSecurityPolicy: false, // Permitir scripts y videos locales/CDN sin bloqueo estricto en desarrollo
        crossOriginEmbedderPolicy: false
    })
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Servir archivos estáticos del frontend (landing page y assets)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
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

// Manejador de rutas no encontradas (404)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Endpoint no encontrado en la API.' });
    }
    // Para rutas web normales, redirigir a index.html
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejador global de errores (Nunca expone stack traces en producción)
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
        console.log(`🔌 API Base en: http://localhost:${PORT}/api/leads`);
        console.log(`🩺 Health Check en: http://localhost:${PORT}/api/health`);
        console.log(`======================================================\n`);
    });
}

// Ejecutar servidor si es llamado directamente
if (require.main === module) {
    startServer();
}

module.exports = app;
