const express = require('express');
const alertsController = require('../controllers/alerts.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', requireAuth, alertsController.listAlerts);
router.get('/summary', requireAuth, alertsController.getAlertsSummary);
router.get('/:id', requireAuth, alertsController.getAlert);
router.patch('/:id', requireAuth, requireRole('reviewer', 'admin'), alertsController.updateAlertStatus);

module.exports = router;