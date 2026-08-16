const { supabase } = require('../config/supabaseClient');

// GET /api/audit?entity=&entityId=&userId=&action=
exports.listAuditLog = async (req, res) => {
  const { entity, entityId, userId, action } = req.query;

  let query = supabase
    .from('audit_log')
    .select('*, users(name, email)')
    .order('timestamp', { ascending: false })
    .limit(200); // cap it — audit log can grow large fast

  if (entity) query = query.eq('entity_type', entity);
  if (entityId) query = query.eq('entity_id', entityId);
  if (userId) query = query.eq('user_id', userId);
  if (action) query = query.eq('action', action);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/audit/:entityType/:entityId
// Full history for one specific record — e.g. every action ever taken on one capture.
exports.getEntityHistory = async (req, res) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, users(name, email)')
    .eq('entity_type', req.params.entityType)
    .eq('entity_id', req.params.entityId)
    .order('timestamp', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};