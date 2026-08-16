const { supabase } = require('../config/supabaseClient');

// GET /api/tigers
exports.listTigers = async (req, res) => {
  const { data, error } = await supabase
    .from('individuals')
    .select('*')
    .order('last_seen', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/tigers/:id
exports.getTiger = async (req, res) => {
  const { data, error } = await supabase
    .from('individuals')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Individual not found' });
  res.json(data);
};

// GET /api/tigers/:id/captures
exports.getTigerCaptures = async (req, res) => {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('individual_id', req.params.id)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/tigers/:id/home-range
exports.getTigerHomeRange = async (req, res) => {
  const { data, error } = await supabase
    .from('home_ranges')
    .select('*')
    .eq('individual_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No home range computed yet for this individual' });
  res.json(data);
};

// PATCH /api/tigers/:id  (reviewer/admin — edit sex, notes, name)
exports.updateTiger = async (req, res) => {
  const { name, sex, notes } = req.body;

  const { data: before } = await supabase
    .from('individuals')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Individual not found' });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (notes !== undefined) updates.notes = notes;
  if (sex !== undefined) {
    if (!['male', 'female', 'unknown'].includes(sex)) {
      return res.status(400).json({ error: 'Invalid sex value' });
    }
    updates.sex = sex;
  }

  const { data: updated, error } = await supabase
    .from('individuals')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'individuals',
    entity_id: updated.id,
    action: 'update',
    user_id: req.user.userId,
    before_state: before,
    after_state: updated,
  });

  res.json(updated);
};