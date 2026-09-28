const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'obra_blanca_secret_token_secure_key_2026_xyz';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@obrablanca.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

/**
 * Controlador de Inicio de Sesión
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa usuario/correo y contraseña.'
            });
        }

        const inputUser = String(email).trim().toLowerCase();
        const inputPass = String(password).trim();

        // Validar credenciales (permite 'admin' o el correo completo)
        const isUserValid = (inputUser === ADMIN_EMAIL || inputUser === 'admin');
        const isPassValid = (inputPass === ADMIN_PASSWORD);

        if (!isUserValid || !isPassValid) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas. Verifica tu correo y contraseña.'
            });
        }

        // Generar Token JWT firmado (7 días de validez)
        const payload = {
            id: 'admin_master',
            email: ADMIN_EMAIL,
            role: 'superadmin',
            name: 'Administrador Principal'
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        // Establecer Cookie HTTP-only segura
        res.cookie('ob_auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
            path: '/'
        });

        return res.json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            token,
            user: {
                email: ADMIN_EMAIL,
                name: 'Ingeniero Administrador',
                role: 'superadmin'
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor al autenticar.'
        });
    }
}

/**
 * Controlador de Cierre de Sesión
 */
async function logout(req, res) {
    res.clearCookie('ob_auth_token', { path: '/' });
    return res.json({
        success: true,
        message: 'Sesión cerrada correctamente.'
    });
}

/**
 * Verificar Sesión Activa
 */
async function me(req, res) {
    return res.json({
        success: true,
        user: req.user
    });
}

module.exports = {
    login,
    logout,
    me
};
