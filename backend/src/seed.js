require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('./config/supabaseClient');

async function seed() {
  console.log('🌱 Starting Manthan4 Supabase Database Seeder...');

  try {
    // 1. Seed Default Admin User
    const defaultEmail = 'admin@manthan.org';
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', defaultEmail)
      .maybeSingle();

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('admin12345', 10);
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: 'Op. Y. Sharma',
          email: defaultEmail,
          password_hash: passwordHash,
          role: 'admin'
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Failed to seed default user:', userError.message);
      } else {
        console.log('✅ Created default user: admin@manthan.org / admin12345 (Role: admin)');
      }
    } else {
      console.log('ℹ️ Default user admin@manthan.org already exists.');
    }

    // 2. Seed Default Field Stations if empty
    const { data: stations, error: stationErr } = await supabase
      .from('stations')
      .select('id');

    if (!stationErr && (!stations || stations.length === 0)) {
      console.log('📡 Seeding camera trap stations...');
      const sampleStations = [
        { name: 'CAM-101', geom: 'SRID=4326;POINT(79.297 21.728)', install_date: '2023-01-15', zone_type: 'core', active: true },
        { name: 'CAM-102', geom: 'SRID=4326;POINT(79.303 21.722)', install_date: '2023-02-10', zone_type: 'core', active: true },
        { name: 'CAM-103', geom: 'SRID=4326;POINT(79.285 21.738)', install_date: '2023-03-01', zone_type: 'buffer', active: true },
        { name: 'CAM-104', geom: 'SRID=4326;POINT(79.316 21.715)', install_date: '2023-04-12', zone_type: 'village_adjacent', active: false },
        { name: 'CAM-105', geom: 'SRID=4326;POINT(79.290 21.720)', install_date: '2023-05-20', zone_type: 'core', active: true },
        { name: 'CAM-106', geom: 'SRID=4326;POINT(79.308 21.733)', install_date: '2023-06-18', zone_type: 'buffer', active: false },
        { name: 'CAM-107', geom: 'SRID=4326;POINT(79.298 21.710)', install_date: '2023-07-04', zone_type: 'core', active: true }
      ];

      const { error: insErr } = await supabase.from('stations').insert(sampleStations);
      if (insErr) console.warn('Station seed note:', insErr.message);
      else console.log('✅ Seeded camera trap stations.');
    }

    // 3. Seed Default Tiger Individuals if empty
    const { data: individuals, error: indErr } = await supabase
      .from('individuals')
      .select('id');

    if (!indErr && (!individuals || individuals.length === 0)) {
      console.log('🐅 Seeding known tiger catalogue...');
      const sampleTigers = [
        {
          tag: 'PT-01',
          name: 'Collarwali',
          sex: 'female',
          first_seen: '2019-03-10T00:00:00Z',
          last_seen: new Date(Date.now() - 3600000 * 2).toISOString(),
          notes: 'Legendary matriarch of Pench. 9 litters recorded.'
        },
        {
          tag: 'PT-02',
          name: 'Bajrang',
          sex: 'male',
          first_seen: '2020-05-14T00:00:00Z',
          last_seen: new Date(Date.now() - 3600000 * 5).toISOString(),
          notes: 'Dominant territorial male spanning Core Zones A and B.'
        },
        {
          tag: 'PT-03',
          name: 'Maya',
          sex: 'female',
          first_seen: '2021-08-20T00:00:00Z',
          last_seen: new Date(Date.now() - 3600000 * 18).toISOString(),
          notes: 'Approaching village buffer perimeter. Monitored for corridor transit.'
        },
        {
          tag: 'PT-04',
          name: 'Raiyya',
          sex: 'male',
          first_seen: '2022-01-11T00:00:00Z',
          last_seen: new Date(Date.now() - 3600000 * 48).toISOString(),
          notes: 'Centroid shifted east towards Turia village edge. Active telemetry watch.'
        }
      ];

      const { error: tErr } = await supabase.from('individuals').insert(sampleTigers);
      if (tErr) console.warn('Individuals seed note:', tErr.message);
      else console.log('✅ Seeded tiger individuals.');
    }

    // 4. Seed Default Alerts if empty
    const { data: alerts, error: altErr } = await supabase.from('alerts').select('id');
    if (!altErr && (!alerts || alerts.length === 0)) {
      console.log('🚨 Seeding alerts stream...');
      const sampleAlerts = [
        {
          type: 'movement_anomaly',
          status: 'open',
          message: 'Movement Anomaly: PT-04 (Raiyya) detected outside typical territory boundaries.',
          created_at: new Date(Date.now() - 600000).toISOString()
        },
        {
          type: 'proximity_alert',
          status: 'open',
          message: 'Proximity Alert: PT-03 (Maya) approaching northern village buffer zone.',
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          type: 'camera_sync',
          status: 'open',
          message: 'Telemetry Ingest Sync: 142 new images ingested from Sector 4.',
          created_at: new Date(Date.now() - 14400000).toISOString()
        }
      ];
      const { error: aErr } = await supabase.from('alerts').insert(sampleAlerts);
      if (aErr) console.warn('Alerts seed note:', aErr.message);
      else console.log('✅ Seeded alerts.');
    }

    console.log('✨ Seeding routine completed!');
  } catch (err) {
    console.error('❌ Seeder error:', err);
  }
}

seed();
