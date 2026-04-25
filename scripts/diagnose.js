#!/usr/bin/env node

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Config
const DB_PATH = path.join(__dirname, "..", "costs.db");
const API_KEY = process.argv[2];
const HOURS = parseInt(process.argv[3] || "24");

if (!API_KEY) {
  console.log("Usage: node scripts/diagnose.js <api-key> [hours]");
  console.log("Example: node scripts/diagnose.js test-customer 24");
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Could not open database:", err.message);
    process.exit(1);
  }
});

const since = Date.now() - HOURS * 60 * 60 * 1000;

db.all(
  `SELECT * FROM requests 
   WHERE customer_api_key = ? 
   AND timestamp >= ?
   AND status = 'success'
   ORDER BY timestamp ASC`,
  [API_KEY, since],
  (err, requests) => {
    if (err) {
      console.error("❌ Query failed:", err.message);
      process.exit(1);
    }

    if (requests.length === 0) {
      console.log(`No requests found for "${API_KEY}" in the last ${HOURS}h`);
      process.exit(0);
    }

    // ── Calculations ─────────────────────────────────────────────────────────

    const totalCost = requests.reduce((s, r) => s + r.total_cost_usd, 0);
    const totalRequests = requests.length;

    // Baseline: median cost per request
    const sorted = [...requests].sort(
      (a, b) => a.total_cost_usd - b.total_cost_usd,
    );
    const median = sorted[Math.floor(sorted.length / 2)].total_cost_usd;
    const baseline = median * totalRequests;
    const overspend = totalCost - baseline;
    const overspendMultiple =
      baseline > 0 ? (totalCost / baseline).toFixed(1) : "N/A";

    // Model waste: requests using opus where input tokens < 500
    const modelWaste = requests.filter(
      (r) => r.model.includes("opus") && r.input_tokens < 500,
    );

    // Loop detection: same agent making >5 requests within any 5 min window
    const loops = [];
    const agentGroups = {};
    requests.forEach((r) => {
      const key = r.agent_id || "default";
      if (!agentGroups[key]) agentGroups[key] = [];
      agentGroups[key].push(r);
    });

    Object.entries(agentGroups).forEach(([agentId, reqs]) => {
      for (let i = 0; i < reqs.length; i++) {
        const windowEnd = reqs[i].timestamp + 5 * 60 * 1000;
        const inWindow = reqs.filter(
          (r) => r.timestamp >= reqs[i].timestamp && r.timestamp <= windowEnd,
        );

        if (inWindow.length > 5) {
          // Calculate average interval between requests in this window
          const intervals = [];
          for (let j = 1; j < inWindow.length; j++) {
            intervals.push(inWindow[j].timestamp - inWindow[j - 1].timestamp);
          }
          const avgInterval =
            intervals.reduce((a, b) => a + b, 0) / intervals.length;

          // Only flag as loop if requests are firing rapidly
          // avg interval under 60 seconds AND same model
          const rapidFire = avgInterval < 60000;
          const sameModel = inWindow.every(
            (r) => r.model === inWindow[0].model,
          );

          if (rapidFire && sameModel) {
            const windowCost = inWindow.reduce(
              (s, r) => s + r.total_cost_usd,
              0,
            );
            loops.push({
              agentId,
              count: inWindow.length,
              avgIntervalSecs: (avgInterval / 1000).toFixed(1),
              startTime: new Date(reqs[i].timestamp).toISOString(),
              cost: windowCost,
            });
            break;
          }
        }
      }
    });

    // Cost spike: find the single most expensive request
    const mostExpensive = sorted[sorted.length - 1];
    const spikeTime = new Date(mostExpensive.timestamp).toISOString();

    // Model breakdown
    const modelBreakdown = {};
    requests.forEach((r) => {
      if (!modelBreakdown[r.model]) {
        modelBreakdown[r.model] = { count: 0, cost: 0 };
      }
      modelBreakdown[r.model].count++;
      modelBreakdown[r.model].cost += r.total_cost_usd;
    });

    // Top agent by cost
    const agentCosts = {};
    requests.forEach((r) => {
      const key = r.agent_id || "default";
      if (!agentCosts[key]) agentCosts[key] = 0;
      agentCosts[key] += r.total_cost_usd;
    });
    const topAgent = Object.entries(agentCosts).sort((a, b) => b[1] - a[1])[0];

    // ── Report ────────────────────────────────────────────────────────────────

    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║       COSTILE DIAGNOSTIC REPORT            ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log(`\n📋 API Key  : ${API_KEY}`);
    console.log(`⏱  Window   : Last ${HOURS} hours`);
    console.log(`📦 Requests : ${totalRequests}`);
    console.log(`💰 Total    : $${totalCost.toFixed(6)}`);
    console.log(`📊 Baseline : $${baseline.toFixed(6)}`);
    console.log(
      `📈 Overspend: $${overspend.toFixed(6)} (${overspendMultiple}x baseline)`,
    );

    // Model breakdown
    console.log("\n── Model Breakdown ──────────────────────────");
    Object.entries(modelBreakdown).forEach(([model, data]) => {
      const pct = ((data.cost / totalCost) * 100).toFixed(1);
      console.log(`   ${model}`);
      console.log(
        `   ${data.count} requests · $${data.cost.toFixed(6)} · ${pct}% of spend`,
      );
    });

    // Top agent
    console.log("\n── Top Agent by Cost ────────────────────────");
    console.log(`   ${topAgent[0]} → $${topAgent[1].toFixed(6)}`);

    // Issues detected
    console.log("\n── Issues Detected ──────────────────────────");

    let issuesFound = 0;

    if (loops.length > 0) {
      issuesFound++;
      loops.forEach((loop) => {
        console.log(`\n⚠️  LOOP DETECTED — agent: ${loop.agentId}`);
        console.log(`   ${loop.count} requests in 5 minutes`);
        console.log(
          `   Avg interval : ${loop.avgIntervalSecs}s between requests`,
        );
        console.log(`   Started      : ${loop.startTime}`);
        console.log(`   Cost         : $${loop.cost.toFixed(6)}`);
        console.log(
          `   Fix          : Add max_turns or cooldown to ${loop.agentId}`,
        );
      });
    }

    if (modelWaste.length > 0) {
      issuesFound++;
      const wasteCost = modelWaste.reduce((s, r) => s + r.total_cost_usd, 0);
      console.log(
        `\n⚠️  MODEL WASTE — ${modelWaste.length} opus requests with <500 input tokens`,
      );
      console.log(`   Wasted  : $${wasteCost.toFixed(6)}`);
      console.log(`   Fix     : Route short requests to claude-haiku`);
      console.log(
        `   Saving  : ~$${(wasteCost * 0.85).toFixed(6)} per equivalent period`,
      );
    }

    if (overspend > 0 && overspendMultiple > 2) {
      issuesFound++;
      console.log(`\n⚠️  COST SPIKE — ${overspendMultiple}x above baseline`);
      console.log(
        `   Peak    : $${mostExpensive.total_cost_usd.toFixed(6)} at ${spikeTime}`,
      );
      console.log(`   Agent   : ${mostExpensive.agent_id || "default"}`);
      console.log(`   Model   : ${mostExpensive.model}`);
    }

    if (issuesFound === 0) {
      console.log("\n✅  No issues detected. Spend looks normal.");
    }

    // Recommendations
    console.log("\n── Recommendations ──────────────────────────");
    if (loops.length > 0) {
      console.log("   → Set hard max_turns limit on looping agents");
    }
    if (modelWaste.length > 0) {
      console.log("   → Use claude-haiku for requests under 500 tokens");
    }
    if (overspend > 0) {
      console.log(
        `   → Set daily budget cap to $${(baseline * 1.2).toFixed(4)}`,
      );
    }
    if (issuesFound === 0) {
      console.log(
        "   → No action needed. Monitor for changes in agent behaviour.",
      );
    }

    console.log("\n════════════════════════════════════════════\n");

    db.close();
  },
);
