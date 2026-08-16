const express = require('express');
const stationsController = require('../controllers/stations.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', requireAuth, stationsController.listStations);
router.get('/:id', requireAuth, stationsController.getStation);
router.post('/', requireAuth, requireRole('admin'), stationsController.createStation);
router.patch('/:id', requireAuth, requireRole('admin'), stationsController.updateStation);
router.delete('/:id', requireAuth, requireRole('admin'), stationsController.deactivateStation);

module.exports = router;