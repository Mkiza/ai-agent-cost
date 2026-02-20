const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Use /app/data in production (Railway volume), local path in dev
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT;
const dbDir = isProduction ? "/app/data" : path.join(__dirname, "..");
const dbPath = path.join(dbDir, "costs.db");

// Create directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to open database:", err);
  } else {
    console.log("✅ Database connected");
  }
});

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_api_key TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      input_cost_usd REAL NOT NULL,
      output_cost_usd REAL NOT NULL,
      total_cost_usd REAL NOT NULL,
      request_duration_ms INTEGER,
      status TEXT DEFAULT 'success'
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_customer_timestamp 
          ON requests(customer_api_key, timestamp)`);
});

function logRequest(data) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO requests (
        customer_api_key, timestamp, model, 
        input_tokens, output_tokens,
        input_cost_usd, output_cost_usd, total_cost_usd,
        request_duration_ms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.customerApiKey,
      data.timestamp,
      data.model,
      data.inputTokens,
      data.outputTokens,
      data.inputCost,
      data.outputCost,
      data.totalCost,
      data.duration,
      data.status,
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );

    stmt.finalize();
  });
}

module.exports = { db, logRequest };
