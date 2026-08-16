const { supabase } = require('../config/supabaseClient');

// GET /api/alerts?status=&type=&individualId=&runId=
exports.listAlerts = async (req, res) => {
  const { status, type, individualId, runId } = req.query;

  let query = supabase
    .from('alerts')
    .select('*, individuals(tag, name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  if (individualId) query = query.eq('individual_id', individualId);
  if (runId) query = query.eq('run_id', runId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/alerts/:id
exports.getAlert = async (req, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, individuals(tag, name)')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Alert not found' });
  res.json(data);
};

// PATCH /api/alerts/:id  { status: 'reviewed' | 'dismissed' }
exports.updateAlertStatus = async (req, res) => {
  const { status } = req.body;
  if (!['open', 'reviewed', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { data: before } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Alert not found' });

  const { data: updated, error } = await supabase
    .from('alerts')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'alerts',
    entity_id: updated.id,
    action: 'update_status',
    user_id: req.user.userId,
    before_state: { status: before.status },
    after_state: { status: updated.status },
  });

  res.json(updated);
};

// GET /api/alerts/summary
// Counts by status/type — used for the dashboard cards.
exports.getAlertsSummary = async (req, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('status, type');

  if (error) return res.status(500).json({ error: error.message });

  const summary = {
    total: data.length,
    byStatus: {},
    byType: {},
  };

  for (const row of data) {
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
    summary.byType[row.type] = (summary.byType[row.type] || 0) + 1;
  }

  res.json(summary);
};