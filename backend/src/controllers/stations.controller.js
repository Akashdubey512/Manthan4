const { supabase } = require('../config/supabaseClient');

// GET /api/stations
exports.listStations = async (req, res) => {
  const { active, zone_type } = req.query;

  let query = supabase.from('stations').select('*').order('created_at', { ascending: false });

  if (active !== undefined) query = query.eq('active', active === 'true');
  if (zone_type) query = query.eq('zone_type', zone_type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/stations/:id
exports.getStation = async (req, res) => {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Station not found' });
  res.json(data);
};

// POST /api/stations  (admin only)
exports.createStation = async (req, res) => {
  const { name, latitude, longitude, install_date, zone_type } = req.body;

  if (!name || latitude === undefined || longitude === undefined || !install_date) {
    return res.status(400).json({ error: 'name, latitude, longitude, and install_date are required' });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Invalid latitude/longitude values' });
  }

  const allowedZones = ['core', 'buffer', 'village_adjacent'];
  const assignedZone = allowedZones.includes(zone_type) ? zone_type : 'core';

  // PostGIS point stored as WKT — Supabase's PostgREST accepts this via a raw geom string
  const geomWKT = `SRID=4326;POINT(${longitude} ${latitude})`;

  const { data: created, error } = await supabase
    .from('stations')
    .insert({
      name,
      geom: geomWKT,
      install_date,
      zone_type: assignedZone,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'stations',
    entity_id: created.id,
    action: 'create',
    user_id: req.user.userId,
    before_state: null,
    after_state: created,
  });

  res.status(201).json(created);
};

// PATCH /api/stations/:id  (admin only)
exports.updateStation = async (req, res) => {
  const { name, latitude, longitude, install_date, active, zone_type } = req.body;

  const { data: before } = await supabase
    .from('stations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Station not found' });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (install_date !== undefined) updates.install_date = install_date;
  if (active !== undefined) updates.active = active;
  if (zone_type !== undefined) {
    if (!['core', 'buffer', 'village_adjacent'].includes(zone_type)) {
      return res.status(400).json({ error: 'Invalid zone_type' });
    }
    updates.zone_type = zone_type;
  }
  if (latitude !== undefined && longitude !== undefined) {
    updates.geom = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  const { data: updated, error } = await supabase
    .from('stations')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'stations',
    entity_id: updated.id,
    action: 'update',
    user_id: req.user.userId,
    before_state: before,
    after_state: updated,
  });

  res.json(updated);
};

// DELETE /api/stations/:id  (admin only) — soft delete, since raw_images/captures reference it
exports.deactivateStation = async (req, res) => {
  const { data: before } = await supabase
    .from('stations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'Station not found' });

  const { data: updated, error } = await supabase
    .from('stations')
    .update({ active: false })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'stations',
    entity_id: updated.id,
    action: 'deactivate',
    user_id: req.user.userId,
    before_state: { active: before.active },
    after_state: { active: false },
  });

  res.json(updated);
};