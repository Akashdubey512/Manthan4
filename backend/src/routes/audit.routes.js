const express = require('express');
const auditController = require('../controllers/audit.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), auditController.listAuditLog);
router.get('/:entityType/:entityId', requireAuth, requireRole('reviewer', 'admin'), auditController.getEntityHistory);

module.exports = router;