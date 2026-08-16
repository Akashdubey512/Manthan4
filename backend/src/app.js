const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic Heartbeat Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Import and register route skeletons here in the future:
// const authRoutes = require('./routes/auth.routes');
// app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Express Server running on port ${PORT}`);
});

module.exports = app;
