const axios = require('axios');
const { supabase } = require('../config/supabaseClient');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const ML_SERVICE_ENABLED = !!ML_SERVICE_URL;

async function startIngest(runId, storagePath) {
  if (!ML_SERVICE_ENABLED) {
    console.warn(`⚠️  ML_SERVICE_URL not set — simulating pipeline run for run ${runId}`);
    return simulateRun(runId);
  }

  // Real call, once the Python FastAPI service exists:
  const res = await axios.post(`${ML_SERVICE_URL}/ingest/start`, {
    run_id: runId,
    storage_path: storagePath,
  });
  return res.data;
}

// TEMPORARY: lets you test the whole app end-to-end before the ML service is built.
// Marks the run "processing" then "completed" with fake numbers after a short delay.
async function simulateRun(runId) {
  await supabase.from('runs').update({ status: 'processing' }).eq('id', runId);

  setTimeout(async () => {
    await supabase
      .from('runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        images_ingested: 120,
        blanks_removed: 87,
      })
      .eq('id', runId);
    console.log(`✅ Simulated run ${runId} marked completed`);
  }, 5000);
}

module.exports = { startIngest };