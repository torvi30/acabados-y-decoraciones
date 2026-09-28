const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Ruta principal para recepción de cotizaciones del embudo (Público)
router.post('/leads', leadController.submitLead);

// Endpoint rápido para cálculo de presupuesto en vivo
router.get('/leads/estimate', leadController.estimatePrice);

// Rutas de administración y Mini-CRM
router.get('/leads/export/csv', leadController.exportCsv);
router.get('/leads', leadController.listLeads);
router.get('/leads/metrics', leadController.getMetrics);
router.patch('/leads/:id/status', leadController.changeStatus);
router.patch('/leads/:id/notes', leadController.updateNotes);
router.delete('/leads/:id', leadController.deleteLead);

module.exports = router;
