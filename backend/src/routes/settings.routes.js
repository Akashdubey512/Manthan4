const express = require('express');
const settingsController = require('../controllers/settings.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/thresholds', requireAuth, settingsController.getThresholds);
router.patch('/thresholds', requireAuth, requireRole('admin'), settingsController.updateThresholds);

module.exports = router;