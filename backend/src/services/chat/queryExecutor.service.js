const { supabase } = require("../../config/supabaseClient");

const ALLOWED_INTENTS = new Set([
    "tiger_count",
    "tiger_lookup",
    "latest_capture",
    "tiger_capture_count",
    "detections_by_zone",
    "open_alerts",
    "tiger_alerts",
    "recent_alerts",
    "alert_type_lookup",
    "latest_run",
    "run_summary",
    "home_range",
    "largest_home_range",
    "active_stations",
    "stations_by_zone",
    "station_capture_count",
    "pending_review",
    "female_tigers",
    "tigers_not_seen_recently",
    "help",
]);

function getTimeRange(timeRange) {
    const now = new Date();

    if (timeRange === "last_24_hours") {
        return {
            from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            to: now,
        };
    }

    if (timeRange === "last_7_days" || timeRange === "recently") {
        return {
            from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            to: now,
        };
    }

    if (timeRange === "this_week") {
        const start = new Date(now);
        const day = start.getUTCDay();

        const diff = day === 0 ? 6 : day - 1;

        start.setUTCDate(start.getUTCDate() - diff);
        start.setUTCHours(0, 0, 0, 0);

        return {
            from: start,
            to: now,
        };
    }

    if (timeRange === "yesterday") {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 1);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        return {
            from: start,
            to: end,
        };
    }

    return null;
}

async function getTigerCount() {
    const { count, error } = await supabase
        .from("individuals")
        .select("*", { count: "exact", head: true });

    if (error) throw error;

    return {
        count: count || 0,
    };
}

async function getTigerByTag(tag) {
    const { data, error } = await supabase
        .from("individuals")
        .select("*")
        .ilike("tag", tag)
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return {
        tiger: data,
    };
}

async function getLatestCapture(tag) {
    const { data: tiger, error: tigerError } = await supabase
        .from("individuals")
        .select("id, tag, name")
        .ilike("tag", tag)
        .limit(1)
        .maybeSingle();

    if (tigerError) throw tigerError;

    if (!tiger) {
        return {
            tiger: null,
            capture: null,
        };
    }

    const { data: captures, error } = await supabase
        .from("captures")
        .select(`
      id,
      timestamp,
      station_id,
      match_confidence,
      review_status,
      run_id
    `)
        .eq("individual_id", tiger.id)
        .order("timestamp", { ascending: false })
        .limit(1);

    if (error) throw error;

    const capture = captures?.[0] || null;

    if (!capture) {
        return {
            tiger,
            capture: null,
        };
    }

    const { data: station, error: stationError } = await supabase
        .from("stations")
        .select("id, name, zone_type")
        .eq("id", capture.station_id)
        .maybeSingle();

    if (stationError) throw stationError;

    return {
        tiger,
        capture: {
            ...capture,
            station,
        },
    };
}

async function getTigerCaptureCount(tag, timeRange) {
    const { data: tiger, error: tigerError } = await supabase
        .from("individuals")
        .select("id, tag, name")
        .ilike("tag", tag)
        .limit(1)
        .maybeSingle();

    if (tigerError) throw tigerError;

    if (!tiger) {
        return {
            tiger: null,
            count: 0,
        };
    }

    let query = supabase
        .from("captures")
        .select("*", { count: "exact", head: true })
        .eq("individual_id", tiger.id);

    const range = getTimeRange(timeRange);

    if (range) {
        query = query
            .gte("timestamp", range.from.toISOString())
            .lt("timestamp", range.to.toISOString());
    }

    const { count, error } = await query;

    if (error) throw error;

    return {
        tiger,
        count: count || 0,
        timeRange: timeRange || "all_time",
    };
}

async function getDetectionsByZone(timeRange) {
    let query = supabase
        .from("captures")
        .select("id, station_id, timestamp");

    const range = getTimeRange(timeRange);

    if (range) {
        query = query
            .gte("timestamp", range.from.toISOString())
            .lt("timestamp", range.to.toISOString());
    }

    const { data: captures, error } = await query;

    if (error) throw error;

    if (!captures || captures.length === 0) {
        return {
            zones: [],
            totalDetections: 0,
        };
    }

    const stationIds = [
        ...new Set(captures.map((capture) => capture.station_id)),
    ];

    const { data: stations, error: stationError } = await supabase
        .from("stations")
        .select("id, name, zone_type")
        .in("id", stationIds);

    if (stationError) throw stationError;

    const stationMap = new Map(
        stations.map((station) => [station.id, station])
    );

    const zoneCounts = {};

    for (const capture of captures) {
        const station = stationMap.get(capture.station_id);

        if (!station) continue;

        const zone = station.zone_type || "unknown";

        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    }

    return {
        zones: Object.entries(zoneCounts).map(([zone_type, count]) => ({
            zone_type,
            count,
        })),
        totalDetections: captures.length,
    };
}

async function getOpenAlerts(limit = 20) {
    const { data, error } = await supabase
        .from("alerts")
        .select(`
      id,
      type,
      description,
      confidence,
      status,
      created_at,
      individual_id,
      individuals (
        tag,
        name
      )
    `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;

    return {
        alerts: data || [],
    };
}

async function getTigerAlerts(tag, limit = 20) {
    const { data: tiger, error: tigerError } = await supabase
        .from("individuals")
        .select("id, tag, name")
        .ilike("tag", tag)
        .limit(1)
        .maybeSingle();

    if (tigerError) throw tigerError;

    if (!tiger) {
        return {
            tiger: null,
            alerts: [],
        };
    }

    const { data: alerts, error } = await supabase
        .from("alerts")
        .select(`
      id,
      type,
      description,
      confidence,
      status,
      created_at
    `)
        .eq("individual_id", tiger.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;

    return {
        tiger,
        alerts: alerts || [],
    };
}

async function getRecentAlerts(timeRange, limit = 20) {
    const range = getTimeRange(timeRange || "last_24_hours");

    let query = supabase
        .from("alerts")
        .select(`
      id,
      type,
      description,
      confidence,
      status,
      created_at,
      individual_id,
      individuals (
        tag,
        name
      )
    `)
        .gte("created_at", range.from.toISOString())
        .lt("created_at", range.to.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return {
        alerts: data || [],
        from: range.from.toISOString(),
        to: range.to.toISOString(),
    };
}

async function getAlertsByType(alertType, limit = 20) {
    const { data, error } = await supabase
        .from("alerts")
        .select(`
      id,
      type,
      description,
      confidence,
      status,
      created_at,
      individuals (
        tag,
        name
      )
    `)
        .eq("type", alertType)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;

    return {
        alertType,
        alerts: data || [],
    };
}

async function getLatestRun() {
    const { data, error } = await supabase
        .from("runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return {
        run: data,
    };
}

async function getRunSummary() {
    const { data: runs, error } = await supabase
        .from("runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(2);

    if (error) throw error;

    return {
        latest: runs?.[0] || null,
        previous: runs?.[1] || null,
    };
}

async function getHomeRange(tag) {
    const { data: tiger, error: tigerError } = await supabase
        .from("individuals")
        .select("id, tag, name")
        .ilike("tag", tag)
        .limit(1)
        .maybeSingle();

    if (tigerError) throw tigerError;

    if (!tiger) {
        return {
            tiger: null,
            homeRange: null,
        };
    }

    const { data, error } = await supabase
        .from("home_ranges")
        .select(`
      id,
      run_id,
      centroid,
      area_sq_km,
      polygon,
      method,
      created_at
    `)
        .eq("individual_id", tiger.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return {
        tiger,
        homeRange: data,
    };
}

async function getLargestHomeRange() {
    const { data, error } = await supabase
        .from("home_ranges")
        .select(`
      id,
      individual_id,
      area_sq_km,
      method,
      created_at,
      individuals (
        tag,
        name
      )
    `)
        .not("area_sq_km", "is", null)
        .order("area_sq_km", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return {
        homeRange: data,
    };
}

async function getActiveStations() {
    const { data, error } = await supabase
        .from("stations")
        .select("id, name, zone_type, install_date, active")
        .eq("active", true)
        .order("name", { ascending: true });

    if (error) throw error;

    return {
        stations: data || [],
    };
}

async function getStationsByZone(zoneType) {
    const { data, error } = await supabase
        .from("stations")
        .select("id, name, zone_type, install_date, active")
        .eq("zone_type", zoneType)
        .order("name", { ascending: true });

    if (error) throw error;

    return {
        zoneType,
        stations: data || [],
    };
}

async function getStationCaptureCount(limit = 10) {
    const { data: captures, error } = await supabase
        .from("captures")
        .select("station_id");

    if (error) throw error;

    const counts = {};

    for (const capture of captures || []) {
        counts[capture.station_id] =
            (counts[capture.station_id] || 0) + 1;
    }

    const ranked = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    if (ranked.length === 0) {
        return {
            stations: [],
        };
    }

    const stationIds = ranked.map(([stationId]) => stationId);

    const { data: stations, error: stationError } = await supabase
        .from("stations")
        .select("id, name, zone_type")
        .in("id", stationIds);

    if (stationError) throw stationError;

    const stationMap = new Map(
        stations.map((station) => [station.id, station])
    );

    return {
        stations: ranked.map(([stationId, count]) => ({
            ...(stationMap.get(stationId) || {}),
            capture_count: count,
        })),
    };
}

async function getPendingReview() {
    const { count, error } = await supabase
        .from("raw_images")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

    if (error) throw error;

    return {
        count: count || 0,
    };
}

async function getFemaleTigers() {
    const { data, error } = await supabase
        .from("individuals")
        .select("id, tag, name, sex, first_seen, last_seen")
        .ilike("sex", "female")
        .order("tag", { ascending: true });

    if (error) throw error;

    return {
        tigers: data || [],
    };
}

async function getTigersNotSeenRecently() {
    const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
        .from("individuals")
        .select("id, tag, name, last_seen")
        .or(`last_seen.is.null,last_seen.lt.${sevenDaysAgo}`)
        .order("last_seen", {
            ascending: true,
            nullsFirst: true,
        });

    if (error) throw error;

    return {
        tigers: data || [],
        threshold: sevenDaysAgo,
    };
}

async function executeQueryPlan(plan) {
    if (!ALLOWED_INTENTS.has(plan.intent)) {
        throw new Error(`Unsupported intent: ${plan.intent}`);
    }

    switch (plan.intent) {
        case "tiger_count":
            return getTigerCount();

        case "tiger_lookup":
            return getTigerByTag(plan.tiger_tag);

        case "latest_capture":
            return getLatestCapture(plan.tiger_tag);

        case "tiger_capture_count":
            return getTigerCaptureCount(
                plan.tiger_tag,
                plan.time_range
            );

        case "detections_by_zone":
            return getDetectionsByZone(plan.time_range);

        case "open_alerts":
            return getOpenAlerts(plan.limit);

        case "tiger_alerts":
            return getTigerAlerts(
                plan.tiger_tag,
                plan.limit
            );

        case "recent_alerts":
            return getRecentAlerts(
                plan.time_range,
                plan.limit
            );

        case "alert_type_lookup":
            return getAlertsByType(
                plan.alert_type,
                plan.limit
            );

        case "latest_run":
            return getLatestRun();

        case "run_summary":
            return getRunSummary();

        case "home_range":
            return getHomeRange(plan.tiger_tag);

        case "largest_home_range":
            return getLargestHomeRange();

        case "active_stations":
            return getActiveStations();

        case "stations_by_zone":
            return getStationsByZone(plan.zone_type);

        case "station_capture_count":
            return getStationCaptureCount(plan.limit);

        case "pending_review":
            return getPendingReview();

        case "female_tigers":
            return getFemaleTigers();

        case "tigers_not_seen_recently":
            return getTigersNotSeenRecently();

        case "help":
            return {
                supported: true,
            };

        default:
            throw new Error("Unsupported query intent");
    }
}

module.exports = {
    executeQueryPlan,
};