const { supabase } = require('../config/supabaseClient');

// POST /api/ingest/upload  (multipart/form-data, field name: "archive")
exports.uploadAndStartRun = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Expected field name "archive".' });
  }
  if (!req.file.originalname.endsWith('.zip')) {
    return res.status(400).json({ error: 'Only .zip files are accepted' });
  }

  // 1. create the run row first, so we have an id to namespace the storage path with
  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({ status: 'pending' })
    .select()
    .single();

  if (runError) return res.status(500).json({ error: runError.message });

  // 2. upload the zip to Supabase Storage under a run-specific path
  const storagePath = `runs/${run.id}/${req.file.originalname}`;

  const { error: uploadError } = await supabase.storage
    .from('raw-uploads')
    .upload(storagePath, req.file.buffer, {
      contentType: 'application/zip',
      upsert: false,
    });

  if (uploadError) {
    // roll back the run row so we don't leave a dangling "pending" run with no file
    await supabase.from('runs').delete().eq('id', run.id);
    return res.status(500).json({ error: uploadError.message });
  }

  // 3. mark the run as uploaded, store the storage path
  const { data: updatedRun, error: updateError } = await supabase
    .from('runs')
    .update({ status: 'uploaded', raw_source_path: storagePath })
    .eq('id', run.id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  await supabase.from('audit_log').insert({
    entity_type: 'runs',
    entity_id: run.id,
    action: 'upload',
    user_id: req.user.userId,
    before_state: null,
    after_state: { status: 'uploaded', raw_source_path: storagePath },
  });

  // 4. kick off the ML pipeline (stubbed for now — see mlClient.js)
  const mlClient = require('../services/mlClient');
  mlClient.startIngest(updatedRun.id, storagePath).catch((err) => {
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

  res.json(run);
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