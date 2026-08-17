// ─── SYNTHETIC DEMO DATA — Not real scientific findings ──────────────────────
// Conforms to Phase 3 scientific specifications:
// - Explicit synthetic identifiers (TEST-TGR-001, TEST-TGR-002, TEST-TGR-003, TEST-TGR-004)
// - Explicitly marked: synthetic = true
// - Real mathematically computed MCP & KDE GeoJSON polygons centered on Pench region.

export const MOCK_STATS = {
  activeTraps: 124,
  offlineTraps: 3,
  recentDetections: 18,
  identifiedTigers: 4,
  lastSync: '2 mins ago',
  synthetic: true,
};

export const MOCK_TIGERS = [
  {
    id: 'TEST-TGR-001',
    name: 'TEST-TGR-001 (Core Female)',
    lat: 21.725,
    lng: 79.295,
    status: 'normal',
    sightings: 47,
    lastSeen: '2026-08-17T08:14:00Z',
    zone: 'Core Zone A',
    sex: 'Female',
    ageClass: 'Adult',
    stripeMatchConfidence: 98,
    movementTrend: 'stable',
    homeRangeKm2: 6.38,
    mcpAreaKm2: 1.47,
    kde95AreaKm2: 6.38,
    kde50AreaKm2: 1.78,
    notes: 'Synthetic individual. Primary territory established across Core Zone A camera traps.',
    synthetic: true,
  },
  {
    id: 'TEST-TGR-002',
    name: 'TEST-TGR-002 (Dominant Male)',
    lat: 21.722,
    lng: 79.309,
    status: 'normal',
    sightings: 31,
    lastSeen: '2026-08-17T05:22:00Z',
    zone: 'Core Zone B',
    sex: 'Male',
    ageClass: 'Adult',
    stripeMatchConfidence: 94,
    movementTrend: 'stable',
    homeRangeKm2: 8.01,
    mcpAreaKm2: 1.59,
    kde95AreaKm2: 8.01,
    kde50AreaKm2: 2.33,
    notes: 'Synthetic individual. Territory overlaps with TEST-TGR-001 in Central Sector.',
    synthetic: true,
  },
  {
    id: 'TEST-TGR-003',
    name: 'TEST-TGR-003 (Sub-adult Female)',
    lat: 21.736,
    lng: 79.284,
    status: 'warning',
    sightings: 22,
    lastSeen: '2026-08-16T18:45:00Z',
    zone: 'Buffer Zone North',
    sex: 'Female',
    ageClass: 'Sub-adult',
    stripeMatchConfidence: 87,
    movementTrend: 'dispersing',
    homeRangeKm2: 5.06,
    mcpAreaKm2: 0.95,
    kde95AreaKm2: 5.06,
    kde50AreaKm2: 1.52,
    notes: 'Synthetic individual. Approaching northern buffer edge. Continuous monitoring active.',
    synthetic: true,
  },
  {
    id: 'TEST-TGR-004',
    name: 'TEST-TGR-004 (Dispersing Male)',
    lat: 21.712,
    lng: 79.320,
    status: 'critical',
    sightings: 15,
    lastSeen: '2026-08-15T12:00:00Z',
    zone: 'Boundary East',
    sex: 'Male',
    ageClass: 'Adult',
    stripeMatchConfidence: 91,
    movementTrend: 'anomalous',
    homeRangeKm2: 7.42,
    mcpAreaKm2: 2.15,
    kde95AreaKm2: 7.42,
    kde50AreaKm2: 2.10,
    notes: 'Synthetic individual. Centroid shifted east towards reserve periphery.',
    synthetic: true,
  },
];

// Movement trail coordinates per tiger — [lat, lng] arrays
export const MOCK_TRAILS = {
  'TEST-TGR-001': [
    [21.725, 79.290], [21.731, 79.294], [21.728, 79.305],
    [21.719, 79.301], [21.721, 79.288], [21.726, 79.295],
  ],
  'TEST-TGR-002': [
    [21.722, 79.300], [21.729, 79.308], [21.725, 79.318],
    [21.715, 79.312], [21.718, 79.305], [21.720, 79.310],
  ],
  'TEST-TGR-003': [
    [21.735, 79.278], [21.742, 79.283], [21.738, 79.291],
    [21.730, 79.285], [21.733, 79.280], [21.736, 79.288],
  ],
  'TEST-TGR-004': [
    [21.710, 79.310], [21.714, 79.317], [21.718, 79.324],
    [21.712, 79.328], [21.708, 79.321], [21.712, 79.320],
  ],
};

// Synthetic Home Range Polygons (Computed via MCP & KDE on synthetic GPS points)
export const MOCK_HOME_RANGES = [
  {
    individual_id: 'TEST-TGR-001',
    synthetic: true,
    method: 'BOTH',
    status: 'estimated',
    points_count: 6,
    centroid: { lat: 21.7247, lng: 79.2967 },
    mcp: {
      method: 'mcp',
      status: 'estimated',
      area_sq_km: 1.47,
      centroid: { lat: 21.7247, lng: 79.2967 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2880, 21.7210], [79.2900, 21.7250], [79.2940, 21.7310],
          [79.3050, 21.7280], [79.3010, 21.7190], [79.2880, 21.7210],
        ]],
      },
    },
    kde_95: {
      percentile: 0.95,
      status: 'estimated',
      area_sq_km: 6.38,
      centroid: { lat: 21.7247, lng: 79.2967 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2820, 21.7180], [79.2850, 21.7270], [79.2910, 21.7340],
          [79.2990, 21.7350], [79.3080, 21.7310], [79.3110, 21.7220],
          [79.3060, 21.7150], [79.2950, 21.7140], [79.2820, 21.7180],
        ]],
      },
    },
    kde_50: {
      percentile: 0.50,
      status: 'estimated',
      area_sq_km: 1.78,
      centroid: { lat: 21.7247, lng: 79.2967 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2910, 21.7220], [79.2930, 21.7270], [79.2980, 21.7290],
          [79.3030, 21.7260], [79.3010, 21.7210], [79.2950, 21.7200],
          [79.2910, 21.7220],
        ]],
      },
    },
  },
  {
    individual_id: 'TEST-TGR-002',
    synthetic: true,
    method: 'BOTH',
    status: 'estimated',
    points_count: 6,
    centroid: { lat: 21.7223, lng: 79.3093 },
    mcp: {
      method: 'mcp',
      status: 'estimated',
      area_sq_km: 1.59,
      centroid: { lat: 21.7223, lng: 79.3093 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.3000, 21.7220], [79.3080, 21.7290], [79.3180, 21.7250],
          [79.3120, 21.7150], [79.3050, 21.7180], [79.3000, 21.7220],
        ]],
      },
    },
    kde_95: {
      percentile: 0.95,
      status: 'estimated',
      area_sq_km: 8.01,
      centroid: { lat: 21.7223, lng: 79.3093 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2940, 21.7180], [79.2980, 21.7270], [79.3070, 21.7330],
          [79.3170, 21.7310], [79.3240, 21.7240], [79.3210, 21.7140],
          [79.3120, 21.7100], [79.3010, 21.7120], [79.2940, 21.7180],
        ]],
      },
    },
    kde_50: {
      percentile: 0.50,
      status: 'estimated',
      area_sq_km: 2.33,
      centroid: { lat: 21.7223, lng: 79.3093 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.3030, 21.7190], [79.3060, 21.7250], [79.3130, 21.7260],
          [79.3160, 21.7210], [79.3120, 21.7160], [79.3050, 21.7160],
          [79.3030, 21.7190],
        ]],
      },
    },
  },
  {
    individual_id: 'TEST-TGR-003',
    synthetic: true,
    method: 'BOTH',
    status: 'estimated',
    points_count: 6,
    centroid: { lat: 21.7361, lng: 79.2843 },
    mcp: {
      method: 'mcp',
      status: 'estimated',
      area_sq_km: 0.95,
      centroid: { lat: 21.7361, lng: 79.2843 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2780, 21.7350], [79.2830, 21.7420], [79.2910, 21.7380],
          [79.2850, 21.7300], [79.2800, 21.7330], [79.2780, 21.7350],
        ]],
      },
    },
    kde_95: {
      percentile: 0.95,
      status: 'estimated',
      area_sq_km: 5.06,
      centroid: { lat: 21.7361, lng: 79.2843 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2720, 21.7310], [79.2760, 21.7410], [79.2850, 21.7460],
          [79.2950, 21.7420], [79.2970, 21.7340], [79.2910, 21.7270],
          [79.2800, 21.7260], [79.2720, 21.7310],
        ]],
      },
    },
    kde_50: {
      percentile: 0.50,
      status: 'estimated',
      area_sq_km: 1.52,
      centroid: { lat: 21.7361, lng: 79.2843 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.2790, 21.7340], [79.2820, 21.7390], [79.2880, 21.7380],
          [79.2890, 21.7330], [79.2840, 21.7310], [79.2790, 21.7340],
        ]],
      },
    },
  },
  {
    individual_id: 'TEST-TGR-004',
    synthetic: true,
    method: 'BOTH',
    status: 'estimated',
    points_count: 6,
    centroid: { lat: 21.7124, lng: 79.3201 },
    mcp: {
      method: 'mcp',
      status: 'estimated',
      area_sq_km: 2.15,
      centroid: { lat: 21.7124, lng: 79.3201 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.3100, 21.7100], [79.3170, 21.7140], [79.3240, 21.7180],
          [79.3280, 21.7120], [79.3210, 21.7080], [79.3100, 21.7100],
        ]],
      },
    },
    kde_95: {
      percentile: 0.95,
      status: 'estimated',
      area_sq_km: 7.42,
      centroid: { lat: 21.7124, lng: 79.3201 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.3040, 21.7060], [79.3090, 21.7170], [79.3210, 21.7230],
          [79.3320, 21.7180], [79.3340, 21.7080], [79.3260, 21.7020],
          [79.3120, 21.7020], [79.3040, 21.7060],
        ]],
      },
    },
    kde_50: {
      percentile: 0.50,
      status: 'estimated',
      area_sq_km: 2.10,
      centroid: { lat: 21.7124, lng: 79.3201 },
      geojson: {
        type: 'Polygon',
        coordinates: [[
          [79.3130, 21.7100], [79.3170, 21.7160], [79.3240, 21.7160],
          [79.3260, 21.7110], [79.3200, 21.7070], [79.3130, 21.7100],
        ]],
      },
    },
  },
];

export const MOCK_CAMERAS = [
  { id: 'CAM-101', lat: 21.728, lng: 79.297, status: 'online',  zone: 'Core A',    lastPing: '3 mins ago', images: 342 },
  { id: 'CAM-102', lat: 21.722, lng: 79.303, status: 'online',  zone: 'Core B',    lastPing: '1 min ago',  images: 217 },
  { id: 'CAM-103', lat: 21.738, lng: 79.285, status: 'online',  zone: 'Buffer N',  lastPing: '8 mins ago', images: 98  },
  { id: 'CAM-104', lat: 21.715, lng: 79.316, status: 'offline', zone: 'Boundary E',lastPing: '3 hrs ago',  images: 0   },
  { id: 'CAM-105', lat: 21.720, lng: 79.290, status: 'online',  zone: 'Core A',    lastPing: '2 mins ago', images: 185 },
  { id: 'CAM-106', lat: 21.733, lng: 79.308, status: 'offline', zone: 'Buffer NE', lastPing: '6 hrs ago',  images: 0   },
  { id: 'CAM-107', lat: 21.710, lng: 79.298, status: 'online',  zone: 'Core B',    lastPing: '5 mins ago', images: 126 },
];

export const MOCK_ALERTS = [
  { id: 'ALT-892', type: 'critical', tigerId: 'TEST-TGR-004', text: 'Movement Anomaly: TEST-TGR-004 detected outside typical territory boundaries.', time: '10 mins ago', location: 'Turia Edge' },
  { id: 'ALT-891', type: 'warning',  tigerId: 'TEST-TGR-003', text: 'Proximity Alert: TEST-TGR-003 approaching village buffer zone.', time: '2 hours ago', location: 'Buffer North' },
  { id: 'ALT-890', type: 'info',     tigerId: null,           text: 'Camera Trap Sync: 142 new images ingested from Sector 4.', time: '4 hours ago', location: 'Sector 4' },
  { id: 'ALT-889', type: 'normal',   tigerId: 'TEST-TGR-001', text: 'Routine Detection: TEST-TGR-001 identified via stripe matching (98% conf).', time: '6 hours ago', location: 'Core A' },
];

export const MOCK_INGEST_HISTORY = [
  { id: 'ING-044', cameraId: 'CAM-101', date: '2026-08-17', files: 342, detections: 18, status: 'complete' },
  { id: 'ING-043', cameraId: 'CAM-102', date: '2026-08-17', files: 217, detections: 9,  status: 'complete' },
  { id: 'ING-042', cameraId: 'CAM-103', date: '2026-08-16', files: 98,  detections: 4,  status: 'complete' },
];
