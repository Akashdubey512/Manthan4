// ─── DEMO DATA — Not real scientific findings ──────────────────────────────
// This file provides structured mock data matching expected API response shapes.
// Replace each export with a real API call when the backend is ready.

export const MOCK_STATS = {
  activeTraps: 124,
  offlineTraps: 3,
  recentDetections: 18,
  identifiedTigers: 14,
  lastSync: '2 mins ago',
};

export const MOCK_TIGERS = [
  {
    id: 'PT-01',
    name: 'Collarwali',
    lat: 21.730,
    lng: 79.295,
    status: 'normal',
    sightings: 47,
    lastSeen: '2023-11-20T08:14:00Z',
    zone: 'Core Zone A',
    sex: 'Female',
    ageClass: 'Adult',
    stripeMatchConfidence: 98,
    movementTrend: 'stable',
    homeRangeKm2: 34,
    notes: 'Most-documented tigress in Pench. 9 litters recorded.',
  },
  {
    id: 'PT-02',
    name: 'Bajrang',
    lat: 21.718,
    lng: 79.310,
    status: 'normal',
    sightings: 31,
    lastSeen: '2023-11-20T05:22:00Z',
    zone: 'Core Zone B',
    sex: 'Male',
    ageClass: 'Adult',
    stripeMatchConfidence: 94,
    movementTrend: 'stable',
    homeRangeKm2: 52,
    notes: 'Dominant male. Territory overlaps Core A and B.',
  },
  {
    id: 'PT-03',
    name: 'Maya',
    lat: 21.740,
    lng: 79.280,
    status: 'warning',
    sightings: 22,
    lastSeen: '2023-11-19T18:45:00Z',
    zone: 'Buffer Zone North',
    sex: 'Female',
    ageClass: 'Sub-adult',
    stripeMatchConfidence: 87,
    movementTrend: 'dispersing',
    homeRangeKm2: 18,
    notes: 'Approaching village buffer boundary. Monitoring required.',
  },
  {
    id: 'PT-04',
    name: 'Raiyya',
    lat: 21.712,
    lng: 79.320,
    status: 'critical',
    sightings: 15,
    lastSeen: '2023-11-17T12:00:00Z',
    zone: 'Boundary East',
    sex: 'Male',
    ageClass: 'Adult',
    stripeMatchConfidence: 91,
    movementTrend: 'anomalous',
    homeRangeKm2: 61,
    notes: 'Outside typical territory. Centroid shifted 3.2km east. Proximity to Turia village.',
  },
];

// Movement trail coords per tiger — [lat, lng] arrays
export const MOCK_TRAILS = {
  'PT-01': [
    [21.725, 79.290], [21.727, 79.292], [21.729, 79.294], [21.730, 79.295],
  ],
  'PT-02': [
    [21.714, 79.305], [21.716, 79.308], [21.718, 79.310],
  ],
  'PT-03': [
    [21.732, 79.282], [21.736, 79.281], [21.740, 79.280],
  ],
  'PT-04': [
    [21.710, 79.310], [21.711, 79.315], [21.712, 79.320],
  ],
};

export const MOCK_CAMERAS = [
  { id: 'CAM-101', lat: 21.728, lng: 79.297, status: 'online',  zone: 'Core A',    lastPing: '3 mins ago', images: 342 },
  { id: 'CAM-102', lat: 21.722, lng: 79.303, status: 'online',  zone: 'Core B',    lastPing: '1 min ago',  images: 217 },
  { id: 'CAM-103', lat: 21.738, lng: 79.285, status: 'online',  zone: 'Buffer N',  lastPing: '8 mins ago', images: 98  },
  { id: 'CAM-104', lat: 21.715, lng: 79.316, status: 'offline', zone: 'Boundary E',lastPing: '3 hrs ago',  images: 0   },
  { id: 'CAM-105', lat: 21.720, lng: 79.290, status: 'online',  zone: 'Core A',    lastPing: '2 mins ago', images: 185 },
  { id: 'CAM-106', lat: 21.733, lng: 79.308, status: 'offline', zone: 'Buffer NE', lastPing: '6 hrs ago',  images: 0   },
  { id: 'CAM-107', lat: 21.710, lng: 79.298, status: 'online',  zone: 'Core B',    lastPing: '5 mins ago', images: 126 },
];

export const MOCK_HUNTER_THREAT = {
  id: 'ALT-999',
  type: 'hunter',
  subtype: 'hunter_detection',
  title: 'Armed Poacher / Intruder Detected',
  cameraId: 'CAM-103',
  cameraZone: 'Sector 4 Buffer (North-East)',
  lat: 21.738,
  lng: 79.285,
  text: 'CRITICAL: Armed Intruder / Suspected Poacher detected at CAM-103. Long-barrel firearm & night intrusion signature verified.',
  time: '4 mins ago',
  location: 'Sector 4 Buffer (CAM-103)',
  threatLevel: 'CODE RED',
  humanConfidence: 98.6,
  weaponConfidence: 92.4,
  individualsCount: 2,
  activity: 'Nocturnal Trespass with Firearm / Snare Equipment',
  proximityThreat: 'PT-03 (Maya) is 650m North-East',
  dispatchedUnit: null,
  status: 'ACTIVE_THREAT',
};

export const MOCK_ALERTS = [
  MOCK_HUNTER_THREAT,
  { id: 'ALT-892', type: 'critical', tigerId: 'PT-04', text: 'Movement Anomaly: PT-04 (Raiyya) detected outside typical territory boundaries.', time: '10 mins ago', location: 'Turia Edge' },
  { id: 'ALT-891', type: 'warning',  tigerId: 'PT-03', text: 'Proximity Alert: PT-03 (Maya) approaching village buffer zone.', time: '2 hours ago', location: 'Buffer North' },
  { id: 'ALT-890', type: 'info',     tigerId: null,    text: 'Camera Trap Sync: 142 new images ingested from Sector 4.', time: '4 hours ago', location: 'Sector 4' },
  { id: 'ALT-889', type: 'normal',   tigerId: 'PT-01', text: 'Routine Detection: PT-01 (Collarwali) identified via stripe matching (98% conf).', time: '6 hours ago', location: 'Core A' },
];

// Demo ingest batches for the Ingest view
export const MOCK_INGEST_HISTORY = [
  { id: 'ING-044', cameraId: 'CAM-101', date: '2023-11-20', files: 342, detections: 18, status: 'complete' },
  { id: 'ING-043', cameraId: 'CAM-102', date: '2023-11-20', files: 217, detections: 9,  status: 'complete' },
  { id: 'ING-042', cameraId: 'CAM-103', date: '2023-11-19', files: 98,  detections: 4,  status: 'complete' },
];
