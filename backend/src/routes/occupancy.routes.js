const express = require('express');
const occupancyController = require('../controllers/occupancy.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/reserve-map', requireAuth, occupancyController.getReserveMap);
router.get('/overlaps', requireAuth, occupancyController.getOverlaps);
router.get('/run/:runId', requireAuth, occupancyController.getRunOccupancy);
router.get('/individual/:individualId/history', requireAuth, occupancyController.getIndividualHistory);

module.exports = router;