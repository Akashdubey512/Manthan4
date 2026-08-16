const express = require('express');
const multer = require('multer');
const ingestController = require('../controllers/ingest.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// memory storage since we're streaming straight to Supabase Storage, not local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB cap — adjust to your sample data size
});

router.post('/upload', requireAuth, upload.single('archive'), ingestController.uploadAndStartRun);
router.get('/runs/:runId/status', requireAuth, ingestController.getRunStatus);
router.get('/runs', requireAuth, ingestController.listRuns);

module.exports = router;