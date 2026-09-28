const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAdminAuthApi } = require('../middlewares/authMiddleware');
const { uploadProjectImages, uploadSingle } = require('../middlewares/uploadMiddleware');

// Rutas Públicas (para la web y el comparador Antes y Después)
router.get('/projects', projectController.getProjects);
router.get('/projects/featured', projectController.getFeatured);

// Rutas Protegidas de Administración
router.post('/projects', requireAdminAuthApi, uploadProjectImages, projectController.create);
router.put('/projects/:id', requireAdminAuthApi, uploadProjectImages, projectController.update);
router.patch('/projects/:id/featured', requireAdminAuthApi, projectController.setFeatured);
router.delete('/projects/:id', requireAdminAuthApi, projectController.deleteProj);

// Subida individual de imágenes (opcional para galerías o bitácora)
router.post('/upload', requireAdminAuthApi, uploadSingle, projectController.uploadImage);

module.exports = router;
