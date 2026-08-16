// src/routes/review.routes.js — full file, blanks + ambiguous together
const express = require('express');
const reviewController = require('../controllers/review.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/blanks', requireAuth, requireRole('reviewer', 'admin'), reviewController.listBlanks);
router.post('/blanks/:id/restore', requireAuth, requireRole('reviewer', 'admin'), reviewController.restoreImage);
router.post('/blanks/:id/confirm-delete', requireAuth, requireRole('reviewer', 'admin'), reviewController.confirmDelete);
router.post('/blanks/bulk-action', requireAuth, requireRole('reviewer', 'admin'), reviewController.bulkAction);

router.get('/ambiguous', requireAuth, requireRole('reviewer', 'admin'), reviewController.listAmbiguous);
router.post('/ambiguous/:captureId/confirm', requireAuth, requireRole('reviewer', 'admin'), reviewController.confirmMatch);
router.post('/ambiguous/:captureId/new-individual', requireAuth, requireRole('reviewer', 'admin'), reviewController.enrollNewIndividual);
router.post('/ambiguous/:captureId/reject', requireAuth, requireRole('reviewer', 'admin'), reviewController.rejectCapture);

module.exports = router;