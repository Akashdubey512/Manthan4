const { supabase } = require('../config/supabaseClient');

// GET /api/settings/thresholds
exports.getThresholds = async (req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'thresholds')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Thresholds not configured yet' });

  res.json(data.value);
};

// PATCH /api/settings/thresholds  (admin only)
// Body is a partial object — only the keys being changed, merged into existing value.
exports.updateThresholds = async (req, res) => {
  const { data: existing } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'thresholds')
    .maybeSingle();

  const currentValue = existing?.value || {};
  const newValue = { ...currentValue, ...req.body };

  const { data: updated, error } = await supabase
    .from('settings')
    .upsert({
      key: 'thresholds',
      value: newValue,
      updated_at: new Date().toISOString(),
      updated_by: req.user.userId,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'settings',
    entity_id: 'thresholds',
    action: 'update',
    user_id: req.user.userId,
    before_state: currentValue,
    after_state: newValue,
  });

  res.json(updated.value);
};