// Goz 2.0 — Apple Health Sync Endpoint
// Accepts both GET (from simple URL Shortcut) and POST (from JSON Shortcut)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Support both GET params and POST body
  const params = req.method === "GET" ? req.query : (req.body || {});

  const {
    syncToken, tok,          // tok is the short alias for GET requests
    steps, activeKcal, kcal,
    distanceKm, km,
    weight,
    heartRate, hr,
    workoutMins,
    sleepHours,
    syncDate,
  } = params;

  const token       = syncToken || tok;
  const stepsVal    = parseInt(steps)                      || null;
  const kcalVal     = parseInt(activeKcal || kcal)         || null;
  const distVal     = parseFloat(distanceKm || km)         || null;
  const weightVal   = parseFloat(weight)                   || null;
  const hrVal       = parseInt(heartRate || hr)            || null;
  const workoutVal  = parseInt(workoutMins)                || null;
  const sleepVal    = parseFloat(sleepHours)               || null;

  if (!token) {
    return res.status(401).json({ error: "Missing syncToken — copy it from your app settings." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server not configured. SUPABASE_SERVICE_KEY missing." });
  }

  const db = createClient(supabaseUrl, serviceKey);

  // Find user by their syncToken
  const { data: rows, error: fetchErr } = await db
    .from("user_data")
    .select("user_id, data");

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const row = rows?.find(r => r.data?.syncToken === token);
  if (!row) return res.status(401).json({ error: "Invalid syncToken." });

  const { user_id, data: userData } = row;

  // Work out which day number
  const dateStr    = syncDate || new Date().toISOString().split("T")[0];
  const targetDate = new Date(dateStr);
  const startDate  = userData.startDate ? new Date(userData.startDate) : null;
  const dayNum     = startDate
    ? Math.max(1, Math.floor((targetDate - startDate) / 86_400_000) + 1)
    : 1;

  // Merge into day log
  const logs   = { ...(userData.logs || {}) };
  const dayLog = { ...(logs[dayNum] || {}) };

  if (stepsVal   > 0) dayLog.steps            = stepsVal;
  if (kcalVal    > 0) dayLog.appleCalsBurned  = kcalVal;
  if (distVal    > 0) dayLog.km               = parseFloat(distVal.toFixed(2));
  if (weightVal  > 0) dayLog.weight           = parseFloat(weightVal.toFixed(1));
  if (hrVal      > 0) dayLog.heartRate        = hrVal;
  if (workoutVal >= 20) dayLog.workoutDone    = true;
  if (sleepVal   > 0) dayLog.sleepH           = parseFloat(sleepVal.toFixed(1));
  dayLog.appleHealthSynced = new Date().toISOString();

  logs[dayNum] = dayLog;
  const updatedData = { ...userData, logs };

  const { error: saveErr } = await db
    .from("user_data")
    .update({ data: updatedData, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (saveErr) return res.status(500).json({ error: saveErr.message });

  // For GET requests, redirect back to the app so the user sees it worked
  if (req.method === "GET") {
    return res.redirect(302, "https://goz-transfo.vercel.app/?synced=1");
  }

  return res.status(200).json({
    success: true,
    day: dayNum,
    synced: Object.keys(dayLog).filter(k => k !== "appleHealthSynced"),
    message: `Day ${dayNum} updated from Apple Health ✓`,
  });
}
