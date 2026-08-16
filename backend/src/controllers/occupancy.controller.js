const { supabase } = require('../config/supabaseClient');

// GET /api/occupancy/reserve-map
// Returns the latest home range per individual, for the reserve-wide map view.
exports.getReserveMap = async (req, res) => {
  const { data: individuals, error: indError } = await supabase
    .from('individuals')
    .select('id, tag, name, sex');

  if (indError) return res.status(500).json({ error: indError.message });

  const { data: homeRanges, error: hrError } = await supabase
    .from('home_ranges')
    .select('*')
    .order('created_at', { ascending: false });

  if (hrError) return res.status(500).json({ error: hrError.message });

  // keep only the most recent home_range row per individual
  const latestByIndividual = {};
  for (const hr of homeRanges) {
    if (!latestByIndividual[hr.individual_id]) {
      latestByIndividual[hr.individual_id] = hr;
    }
  }

  const result = individuals
    .filter((ind) => latestByIndividual[ind.id])
    .map((ind) => ({
      individual: ind,
      homeRange: latestByIndividual[ind.id],
    }));

  res.json(result);
};

// GET /api/occupancy/individual/:individualId/history
// All home_range snapshots across runs for one individual — used for centroid-drift charts.
exports.getIndividualHistory = async (req, res) => {
  const { data, error } = await supabase
    .from('home_ranges')
    .select('*')
    .eq('individual_id', req.params.individualId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/occupancy/overlaps
// Pairwise overlap between all individuals' latest home range polygons.
// Uses PostGIS ST_Intersects / ST_Area via a raw RPC call (see SQL function below).
exports.getOverlaps = async (req, res) => {
  const { data, error } = await supabase.rpc('get_home_range_overlaps');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// GET /api/occupancy/run/:runId
// All home ranges computed in one specific run — useful for reviewing a single run's output.
exports.getRunOccupancy = async (req, res) => {
  const { data, error } = await supabase
    .from('home_ranges')
    .select('*, individuals(tag, name)')
    .eq('run_id', req.params.runId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};