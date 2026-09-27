const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = null;
let isConnected = false;

function initFirebase() {
    // Si ya existe una app de Firebase inicializada
    const existingApps = getApps();
    if (existingApps && existingApps.length > 0) {
        db = getFirestore();
        isConnected = true;
        return { db, isConnected: true };
    }

    try {
        // Opción 1: Archivo serviceAccountKey.json en la raíz del proyecto
        const keyFilePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
            ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
            : path.join(__dirname, '../../serviceAccountKey.json');

        if (fs.existsSync(keyFilePath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
            initializeApp({
                credential: cert(serviceAccount)
            });
            db = getFirestore();
            isConnected = true;
            console.log('🔥 Conexión establecida con Firebase Firestore (mediante serviceAccountKey.json)');
            return { db, isConnected: true };
        }

        // Opción 2: Variables de entorno individuales (ideal para Vercel / Render / Heroku)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                })
            });
            db = getFirestore();
            isConnected = true;
            console.log('🔥 Conexión establecida con Firebase Firestore (mediante variables de entorno)');
            return { db, isConnected: true };
        }

        // Fallback: Si no hay credenciales todavía
        console.warn('⚠️ Firebase: No se encontró serviceAccountKey.json ni variables de entorno.');
        console.warn('ℹ️ El sistema funcionará con MySQL o en memoria temporal hasta que cargues tus credenciales de Firebase.');
        isConnected = false;
        return { db: null, isConnected: false };
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error.message);
        isConnected = false;
        return { db: null, isConnected: false };
    }
}

// Inicializar al cargar módulo
initFirebase();

module.exports = {
    getDb: () => db,
    db,
    isFirebaseConnected: () => isConnected,
    initFirebase
};
