const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdminAuthApi } = require('../middlewares/authMiddleware');

// Rutas Públicas de Autenticación
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Rutas Protegidas de Autenticación
router.get('/me', requireAdminAuthApi, authController.me);

module.exports = router;
