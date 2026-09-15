const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'obra_blanca_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

const pool = mysql.createPool(poolConfig);

let isDbConnected = false;

/**
 * Verifica la conectividad inicial con MySQL
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión exitosa a la base de datos MySQL:', poolConfig.database);
        connection.release();
        isDbConnected = true;
        return true;
    } catch (error) {
        isDbConnected = false;
        console.warn('⚠️ Advertencia: No se pudo conectar a MySQL con la configuración actual:');
        console.warn(`   Host: ${poolConfig.host}:${poolConfig.port} | Usuario: ${poolConfig.user} | Base de datos: ${poolConfig.database}`);
        console.warn(`   Detalle del error: ${error.message}`);
        console.warn('   (Verifica que el servicio MySQL esté activo y las credenciales en .env sean correctas)');
        return false;
    }
}

/**
 * Ejecutor seguro de consultas parametrizadas
 * @param {string} sql - Sentencia SQL con placeholders ?
 * @param {Array} params - Parámetros ordenados
 */
async function query(sql, params = []) {
    const [results] = await pool.execute(sql, params);
    return results;
}

module.exports = {
    pool,
    query,
    testConnection,
    isDbConnected: () => isDbConnected
};
