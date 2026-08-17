// src/routes/tigers.routes.js
const express = require('express');
const tigersController = require('../controllers/tigers.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', requireAuth, tigersController.listTigers);
router.get('/trails', requireAuth, tigersController.getTrails);
router.get('/:id', requireAuth, tigersController.getTiger);
router.get('/:id/captures', requireAuth, tigersController.getTigerCaptures);
router.get('/:id/home-range', requireAuth, tigersController.getTigerHomeRange);
router.patch('/:id', requireAuth, requireRole('reviewer', 'admin'), tigersController.updateTiger);

module.exports = router;