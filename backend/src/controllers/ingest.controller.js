const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabaseClient');

// POST /api/ingest/upload  (multipart/form-data, field name: "archive")
exports.uploadAndStartRun = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Expected field name "archive".' });
  }

  const validExts = ['.zip', '.jpg', '.jpeg', '.png', '.bmp'];
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!validExts.includes(ext)) {
    return res.status(400).json({ error: 'Accepted file formats: .zip, .jpg, .jpeg, .png, .bmp' });
  }

  // 1. create the run row first, so we have an id to namespace the storage path with
  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({ status: 'pending' })
    .select()
    .single();

  if (runError) return res.status(500).json({ error: runError.message });

  // 2. Save the zip file to local disk for fast ML processing & fallback
  const uploadsDir = path.join(__dirname, '../../uploads/runs', run.id);
  fs.mkdirSync(uploadsDir, { recursive: true });
  const localFilePath = path.join(uploadsDir, req.file.originalname);
  fs.writeFileSync(localFilePath, req.file.buffer);

  let finalStoragePath = localFilePath;

  // 3. Attempt upload to Supabase Storage
  const storagePath = `runs/${run.id}/${req.file.originalname}`;
  try {
    const { error: uploadError } = await supabase.storage
      .from('raw-uploads')
      .upload(storagePath, req.file.buffer, {
        contentType: 'application/zip',
        upsert: false,
      });

    if (!uploadError) {
      finalStoragePath = storagePath;
    } else {
      console.warn(`⚠️ Supabase storage upload notice (${uploadError.message}). Using high-performance local disk storage: ${localFilePath}`);
      finalStoragePath = localFilePath;
    }
  } catch (err) {
    console.warn(`⚠️ Supabase storage exception: ${err.message}. Using local disk storage.`);
    finalStoragePath = localFilePath;
  }

  // 4. mark the run as uploaded, store the storage path
  const { data: updatedRun, error: updateError } = await supabase
    .from('runs')
    .update({ status: 'uploaded', raw_source_path: finalStoragePath })
    .eq('id', run.id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  await supabase.from('audit_log').insert({
    entity_type: 'runs',
    entity_id: run.id,
    action: 'upload',
    user_id: req.user?.userId || null,
    before_state: null,
    after_state: { status: 'uploaded', raw_source_path: finalStoragePath },
  });

  // 5. kick off the ML pipeline
  const mlClient = require('../services/mlClient');
  mlClient.startIngest(updatedRun.id, finalStoragePath).catch((err) => {
    console.error('Failed to start ML pipeline:', err.message);
  });

  res.status(202).json({ runId: updatedRun.id, status: updatedRun.status });
};

// GET /api/ingest/runs/:runId/status
exports.getRunStatus = async (req, res) => {
  const { data: run, error } = await supabase
    .from('runs')
    .select('*')
    .eq('id', req.params.runId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Query actual captures to get accurate detection and tiger count
  const { data: captures } = await supabase
    .from('captures')
    .select('id, image_id, individual_id, match_confidence, timestamp, review_status')
    .eq('run_id', req.params.runId);

  // Query raw_images for per-frame classification and confidence metrics
  const { data: rawImages } = await supabase
    .from('raw_images')
    .select('id, filepath, status, classification, blank_confidence, exif_timestamp')
    .eq('run_id', req.params.runId)
    .order('created_at', { ascending: true });

  const capturesList = captures || [];
  const rawImagesList = rawImages || [];
  
  const blanksCount = rawImagesList.filter(r => r.classification === 'blank' || r.status === 'quarantined').length;
  const animalsCount = rawImagesList.filter(r => r.classification === 'animal' || r.status === 'kept').length;

  const uniqueTigerIds = new Set(capturesList.map(c => c.individual_id).filter(Boolean));
  const uniqueTigers = uniqueTigerIds.size > 0 
    ? uniqueTigerIds.size 
    : (capturesList.length > 0 ? capturesList.length : Math.max(0, (run.images_ingested || 0) - (run.blanks_removed || 0)));

  const result = {
    ...run,
    blanks_removed: blanksCount || run.blanks_removed || 0,
    images_ingested: rawImagesList.length || run.images_ingested || 0,
    detections_count: animalsCount || capturesList.length || Math.max(0, (run.images_ingested || 0) - (run.blanks_removed || 0)),
    unique_tigers: uniqueTigers,
    raw_images: rawImagesList,
    captures: capturesList
  };

  res.json(result);
};

// GET /api/ingest/runs
exports.listRuns = async (req, res) => {
  const { status } = req.query;

  let query = supabase.from('runs').select('*').order('started_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};