const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'obra_blanca_secret_token_secure_key_2026_xyz';

/**
 * Middleware para proteger rutas de la API (/api/leads, etc.)
 * Responde 401 JSON si no hay token válido
 */
function requireAdminAuthApi(req, res, next) {
    let token = null;

    // 1. Verificar en cookies
    if (req.cookies && req.cookies.ob_auth_token) {
        token = req.cookies.ob_auth_token;
    }
    // 2. Verificar en header Authorization: Bearer <token>
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Acceso no autorizado. Inicie sesión para continuar.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Sesión expirada o token inválido. Inicie sesión nuevamente.'
        });
    }
}

/**
 * Middleware para proteger páginas web del navegador (/admin)
 * Redirige a /login si no hay sesión activa
 */
function requireAdminAuthWeb(req, res, next) {
    let token = null;

    if (req.cookies && req.cookies.ob_auth_token) {
        token = req.cookies.ob_auth_token;
    }

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('ob_auth_token');
        return res.redirect('/login');
    }
}

module.exports = {
    requireAdminAuthApi,
    requireAdminAuthWeb
};
