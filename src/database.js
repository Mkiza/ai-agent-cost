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

  db.run(`
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_api_key TEXT NOT NULL UNIQUE,
    daily_limit_usd REAL,
    monthly_limit_usd REAL,
    alert_email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

  db.run(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_api_key TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    alert_period TEXT NOT NULL,
    spend_amount REAL NOT NULL,
    limit_amount REAL NOT NULL,
    sent_at INTEGER NOT NULL,
    email_sent BOOLEAN DEFAULT 0
  )
`);

  // Add alert_email column if it doesn't exist (migration)
  db.run(
    `
    PRAGMA table_info(budgets)
  `,
    (err, rows) => {
      if (!err) {
        db.all(`PRAGMA table_info(budgets)`, [], (err, columns) => {
          const hasAlertEmail = columns.some(
            (col) => col.name === "alert_email",
          );

          if (!hasAlertEmail) {
            console.log("🔧 Adding alert_email column to budgets table...");
            db.run(`ALTER TABLE budgets ADD COLUMN alert_email TEXT`, (err) => {
              if (err) {
                console.error("❌ Failed to add alert_email column:", err);
              } else {
                console.log("✅ alert_email column added");
              }
            });
          }
        });
      }
    },
  );

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

function getBudget(customerApiKey) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM budgets WHERE customer_api_key = ?`,
      [customerApiKey],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      },
    );
  });
}

function getTodaySpend(customerApiKey) {
  return new Promise((resolve, reject) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    db.get(
      `SELECT COALESCE(SUM(total_cost_usd), 0) as total 
       FROM requests 
       WHERE customer_api_key = ? 
       AND timestamp >= ? 
       AND status = 'success'`,
      [customerApiKey, todayStart.getTime()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      },
    );
  });
}

function getMonthSpend(customerApiKey) {
  return new Promise((resolve, reject) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    db.get(
      `SELECT COALESCE(SUM(total_cost_usd), 0) as total 
       FROM requests 
       WHERE customer_api_key = ? 
       AND timestamp >= ? 
       AND status = 'success'`,
      [customerApiKey, monthStart.getTime()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      },
    );
  });
}

function setBudget(customerApiKey, dailyLimit, monthlyLimit, alertEmail) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    db.run(
      `INSERT INTO budgets (customer_api_key, daily_limit_usd, monthly_limit_usd, alert_email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(customer_api_key) 
       DO UPDATE SET 
         daily_limit_usd = excluded.daily_limit_usd,
         monthly_limit_usd = excluded.monthly_limit_usd,
         alert_email = excluded.alert_email,
         updated_at = excluded.updated_at`,
      [customerApiKey, dailyLimit, monthlyLimit, alertEmail, now, now],
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

function getRecentAlert(customerApiKey, alertType, period) {
  return new Promise((resolve, reject) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    db.get(
      `SELECT * FROM alerts 
       WHERE customer_api_key = ? 
       AND alert_type = ? 
       AND alert_period = ?
       AND sent_at > ?
       ORDER BY sent_at DESC LIMIT 1`,
      [customerApiKey, alertType, period, oneHourAgo],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      },
    );
  });
}

function logAlert(customerApiKey, alertType, period, spend, limit, emailSent) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO alerts (customer_api_key, alert_type, alert_period, spend_amount, limit_amount, sent_at, email_sent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customerApiKey,
        alertType,
        period,
        spend,
        limit,
        Date.now(),
        emailSent ? 1 : 0,
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

// Update exports
module.exports = {
  db,
  logRequest,
  getBudget,
  getTodaySpend,
  getMonthSpend,
  setBudget,
  getRecentAlert,
  logAlert,
};
