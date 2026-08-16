const { supabase } = require('../config/supabaseClient');

// GET /api/captures?stationId=&individualId=&from=&to=
exports.listCaptures = async (req, res) => {
  const { stationId, individualId, from, to } = req.query;

  let query = supabase.from('captures').select('*').order('timestamp', { ascending: false });

  if (stationId) query = query.eq('station_id', stationId);
  if (individualId) query = query.eq('individual_id', individualId);
  if (from) query = query.gte('timestamp', from);
  if (to) query = query.lte('timestamp', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/captures/:id
exports.getCapture = async (req, res) => {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Capture not found' });
  res.json(data);
};