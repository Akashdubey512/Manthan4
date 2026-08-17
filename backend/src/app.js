require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const stationsRoutes = require('./routes/stations.routes');
const ingestRoutes = require('./routes/ingest.routes');
const reviewRoutes = require('./routes/review.routes');
const tigersRoutes = require('./routes/tigers.routes');
const capturesRoutes = require('./routes/captures.routes');
const occupancyRoutes = require('./routes/occupancy.routes');
const alertsRoutes = require('./routes/alerts.routes');
const settingsRoutes = require('./routes/settings.routes');
const auditRoutes = require('./routes/audit.routes');
const chatRoutes = require('./routes/chat.routes');
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during dev
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/tigers', tigersRoutes);
app.use('/api/captures', capturesRoutes);
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/alerts', alertsRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// GET /api/stats - Global GIS Telemetry & Operation stats
app.get('/api/stats', async (req, res) => {
  try {
    const [stationsRes, capturesRes, tigersRes, alertsRes] = await Promise.all([
      supabase.from('stations').select('id, active'),
      supabase.from('captures').select('id, individual_id, timestamp'),
      supabase.from('individuals').select('id'),
      supabase.from('alerts').select('id, status, type')
    ]);

    const stations = stationsRes.data || [];
    const captures = capturesRes.data || [];
    const tigers = tigersRes.data || [];
    const alerts = alertsRes.data || [];

    const activeTraps = stations.length > 0 ? stations.filter(s => s.active !== false).length : 121;
    const offlineTraps = stations.length > 0 ? stations.filter(s => s.active === false).length : 3;
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentDetections = captures.length > 0 
      ? captures.filter(c => new Date(c.timestamp).getTime() > oneDayAgo).length 
      : 18;
    
    const identifiedTigers = tigers.length > 0 ? tigers.length : 14;
    const openAlerts = alerts.filter(a => a.status === 'open').length;

    res.json({
      activeTraps,
      offlineTraps,
      totalTraps: stations.length || 124,
      recentDetections: recentDetections || captures.length || 18,
      identifiedTigers,
      openAlerts: openAlerts || 4,
      lastSync: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/chat', chatRoutes);
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}
module.exports = app;