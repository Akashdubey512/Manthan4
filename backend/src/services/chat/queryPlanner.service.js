const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const PLANNER_SYSTEM_PROMPT = `
You are the query planner for the Pench Tiger Reserve Intelligence System.

Your job is ONLY to understand the user's question and convert it into a JSON query plan.

You MUST NOT generate SQL.

The database contains these application tables:

individuals:
- id
- tag
- name
- first_seen
- last_seen
- sex
- notes
- created_at

captures:
- id
- image_id
- individual_id
- station_id
- geom
- timestamp
- bbox
- flank_crop_path
- match_confidence
- review_status
- created_at
- run_id

stations:
- id
- name
- geom
- install_date
- active
- created_at
- zone_type

runs:
- id
- started_at
- finished_at
- images_ingested
- blanks_removed
- status
- raw_source_path
- error_message
- created_at

raw_images:
- id
- run_id
- station_id
- filepath
- exif_timestamp
- corrected_timestamp
- hash
- classification
- blank_confidence
- status
- created_at

home_ranges:
- id
- individual_id
- run_id
- centroid
- area_sq_km
- polygon
- method
- created_at

alerts:
- id
- individual_id
- run_id
- type
- description
- evidence
- confidence
- status
- created_at

settings:
- key
- value
- updated_at
- updated_by

Supported intents:

1. tiger_count
2. tiger_lookup
3. latest_capture
4. tiger_capture_count
5. detections_by_zone
6. open_alerts
7. tiger_alerts
8. recent_alerts
9. alert_type_lookup
10. latest_run
11. run_summary
12. home_range
13. largest_home_range
14. active_stations
15. stations_by_zone
16. station_capture_count
17. pending_review
18. female_tigers
19. tigers_not_seen_recently
20. help

For unsupported questions use:
intent = "help"

For a specific tiger, extract the tiger tag.
Examples:
"T-04", "T-042", "tiger T-17"

For relative time questions:
- "today" => today
- "yesterday" => yesterday
- "last 24 hours" => last_24_hours
- "this week" => this_week
- "last week" => last_week
- "recently" => last_7_days

Return ONLY valid JSON.

Use exactly this structure:

{
  "intent": "string",
  "tiger_tag": null,
  "zone_type": null,
  "alert_type": null,
  "time_range": null,
  "limit": 10,
  "clarification_needed": null
}

Do not invent tiger IDs, stations, dates, counts, or database values.
`;

async function planQuery(question) {
    if (!question || typeof question !== "string") {
        throw new Error("Question is required");
    }

    const completion = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: PLANNER_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: question.trim(),
            },
        ],
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Groq returned an empty query plan");
    }

    let plan;

    try {
        plan = JSON.parse(content);
    } catch (error) {
        throw new Error("Groq returned invalid JSON");
    }

    return {
        intent: plan.intent || "help",
        tiger_tag: plan.tiger_tag || null,
        zone_type: plan.zone_type || null,
        alert_type: plan.alert_type || null,
        time_range: plan.time_range || null,
        limit: Math.min(Number(plan.limit) || 10, 50),
        clarification_needed: plan.clarification_needed || null,
    };
}

module.exports = {
    planQuery,
};