// src/controllers/review.controller.js
const { supabase } = require('../config/supabaseClient');

// ============================================================
// Blank image review
// ============================================================

// GET /api/review/blanks?runId=&status=quarantined
exports.listBlanks = async (req, res) => {
  const { runId, status } = req.query;

  let query = supabase
    .from('raw_images')
    .select('*')
    .order('blank_confidence', { ascending: true }); // most-uncertain first

  query = query.eq('status', status || 'quarantined');
  if (runId) query = query.eq('run_id', runId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// POST /api/review/blanks/:id/restore
exports.restoreImage = async (req, res) => {
  const { data: before } = await supabase
    .from('raw_images')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Image not found' });
  if (before.status !== 'quarantined') {
    return res.status(400).json({ error: `Cannot restore an image with status "${before.status}"` });
  }

  const { data: updated, error } = await supabase
    .from('raw_images')
    .update({ status: 'kept' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'raw_images',
    entity_id: updated.id,
    action: 'restore',
    user_id: req.user.userId,
    before_state: { status: before.status },
    after_state: { status: 'kept' },
  });

  res.json(updated);
};

// POST /api/review/blanks/:id/confirm-delete
exports.confirmDelete = async (req, res) => {
  const { data: before } = await supabase
    .from('raw_images')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Image not found' });
  if (before.status !== 'quarantined') {
    return res.status(400).json({ error: `Cannot delete an image with status "${before.status}"` });
  }

  const { data: updated, error } = await supabase
    .from('raw_images')
    .update({ status: 'deleted' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'raw_images',
    entity_id: updated.id,
    action: 'confirm_delete',
    user_id: req.user.userId,
    before_state: { status: before.status },
    after_state: { status: 'deleted' },
  });

  // Physical file cleanup from Supabase Storage is optional for the hackathon —
  // leaving the file in place and relying on status='deleted' is fine. To actually
  // delete the file too:
  // await supabase.storage.from('raw-uploads').remove([before.filepath]);

  res.json(updated);
};

// POST /api/review/blanks/bulk-action  { ids: [...], action: 'restore' | 'confirm-delete' }
exports.bulkAction = async (req, res) => {
  const { ids, action } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  if (!['restore', 'confirm-delete'].includes(action)) {
    return res.status(400).json({ error: 'action must be "restore" or "confirm-delete"' });
  }

  const newStatus = action === 'restore' ? 'kept' : 'deleted';

  const { data: updated, error } = await supabase
    .from('raw_images')
    .update({ status: newStatus })
    .in('id', ids)
    .eq('status', 'quarantined') // only touch rows still actually quarantined
    .select();

  if (error) return res.status(500).json({ error: error.message });

  const auditRows = updated.map((row) => ({
    entity_type: 'raw_images',
    entity_id: row.id,
    action: action === 'restore' ? 'restore' : 'confirm_delete',
    user_id: req.user.userId,
    before_state: { status: 'quarantined' },
    after_state: { status: newStatus },
  }));

  if (auditRows.length > 0) {
    await supabase.from('audit_log').insert(auditRows);
  }

  res.json({ updatedCount: updated.length, skippedCount: ids.length - updated.length, updated });
};

// ============================================================
// Ambiguous individual-ID review
// ============================================================

// GET /api/review/ambiguous?runId=
exports.listAmbiguous = async (req, res) => {
  const { runId } = req.query;

  let query = supabase
    .from('captures')
    .select('*')
    .eq('review_status', 'pending')
    .order('match_confidence', { ascending: true });

  if (runId) query = query.eq('run_id', runId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// POST /api/review/ambiguous/:captureId/confirm  { individualId }
exports.confirmMatch = async (req, res) => {
  const { individualId } = req.body;
  if (!individualId) return res.status(400).json({ error: 'individualId is required' });

  const { data: before } = await supabase
    .from('captures')
    .select('*')
    .eq('id', req.params.captureId)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Capture not found' });

  const { data: updated, error } = await supabase
    .from('captures')
    .update({ individual_id: individualId, review_status: 'human_confirmed' })
    .eq('id', req.params.captureId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'captures',
    entity_id: updated.id,
    action: 'confirm_match',
    user_id: req.user.userId,
    before_state: { individual_id: before.individual_id, review_status: before.review_status },
    after_state: { individual_id: updated.individual_id, review_status: updated.review_status },
  });

  res.json(updated);
};

// POST /api/review/ambiguous/:captureId/new-individual  { tag, name }
exports.enrollNewIndividual = async (req, res) => {
  const { tag, name } = req.body;
  if (!tag) return res.status(400).json({ error: 'tag is required (e.g. "T-045")' });

  const { data: capture } = await supabase
    .from('captures')
    .select('*')
    .eq('id', req.params.captureId)
    .maybeSingle();

  if (!capture) return res.status(404).json({ error: 'Capture not found' });

  const { data: newIndividual, error: createError } = await supabase
    .from('individuals')
    .insert({ tag, name, first_seen: capture.timestamp, last_seen: capture.timestamp })
    .select()
    .single();

  if (createError) return res.status(500).json({ error: createError.message });

  const { data: updatedCapture, error: updateError } = await supabase
    .from('captures')
    .update({ individual_id: newIndividual.id, review_status: 'human_confirmed' })
    .eq('id', req.params.captureId)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  await supabase.from('audit_log').insert([
    {
      entity_type: 'individuals', entity_id: newIndividual.id, action: 'create',
      user_id: req.user.userId, before_state: null, after_state: newIndividual,
    },
    {
      entity_type: 'captures', entity_id: updatedCapture.id, action: 'enroll_new_individual',
      user_id: req.user.userId,
      before_state: { individual_id: capture.individual_id },
      after_state: { individual_id: newIndividual.id },
    },
  ]);

  res.status(201).json({ individual: newIndividual, capture: updatedCapture });
};

// POST /api/review/ambiguous/:captureId/reject
exports.rejectCapture = async (req, res) => {
  const { data: before } = await supabase
    .from('captures')
    .select('*')
    .eq('id', req.params.captureId)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Capture not found' });

  const { data: updated, error } = await supabase
    .from('captures')
    .update({ review_status: 'rejected' })
    .eq('id', req.params.captureId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'captures', entity_id: updated.id, action: 'reject',
    user_id: req.user.userId,
    before_state: { review_status: before.review_status },
    after_state: { review_status: 'rejected' },
  });

  res.json(updated);
};