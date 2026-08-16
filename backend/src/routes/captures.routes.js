// src/routes/captures.routes.js
const express = require('express');
const capturesController = require('../controllers/captures.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, capturesController.listCaptures);
router.get('/:id', requireAuth, capturesController.getCapture);

module.exports = router;