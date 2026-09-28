const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { requireAdminAuthApi } = require('../middlewares/authMiddleware');

// Rutas Públicas (Landing page & Calculadora de cotizaciones)
router.post('/leads', leadController.submitLead);
router.get('/leads/estimate', leadController.estimatePrice);

// Rutas Protegidas del Mini-CRM (Solo personal autorizado)
router.get('/leads/export/csv', requireAdminAuthApi, leadController.exportCsv);
router.get('/leads', requireAdminAuthApi, leadController.listLeads);
router.get('/leads/metrics', requireAdminAuthApi, leadController.getMetrics);
router.patch('/leads/:id/status', requireAdminAuthApi, leadController.changeStatus);
router.patch('/leads/:id/notes', requireAdminAuthApi, leadController.updateNotes);
router.delete('/leads/:id', requireAdminAuthApi, leadController.deleteLead);

module.exports = router;
