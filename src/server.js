require("dotenv").config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const { sendAlert, formatCostAlert } = require("./email");
const {
  db,
  logRequest,
  getBudget,
  getTodaySpend,
  getMonthSpend,
  setBudget,
  getRecentAlert,
  logAlert,
} = require("./database");
const { calculateCost } = require("./pricing");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Main proxy endpoint
app.post("/v1/messages", async (req, res) => {
  const startTime = Date.now();
  const customerApiKey = req.headers["x-api-key"];
  const agentId = req.headers["x-agent-id"] || "default"; // NEW: Extract agent ID

  // Validate customer API key exists
  if (!customerApiKey) {
    return res.status(401).json({
      error: "Missing x-api-key header",
    });
  }

  // Validate Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server not configured with Anthropic API key",
    });
  }

  try {
    // NEW: Check budget limits
    const budget = await getBudget(customerApiKey);

    if (budget) {
      if (budget.daily_limit_usd) {
        const todaySpend = await getTodaySpend(customerApiKey);

        // Check if budget exceeded
        if (todaySpend >= budget.daily_limit_usd) {
          // Send alert email (only once per hour to avoid spam)
          const recentAlert = await getRecentAlert(
            customerApiKey,
            "budget_exceeded",
            "daily",
          );

          if (!recentAlert && budget.alert_email) {
            const alert = formatCostAlert(
              customerApiKey,
              todaySpend,
              budget.daily_limit_usd,
              "daily",
            );
            const sent = await sendAlert(
              budget.alert_email,
              alert.subject,
              alert.text,
              alert.html,
            );
            await logAlert(
              customerApiKey,
              "budget_exceeded",
              "daily",
              todaySpend,
              budget.daily_limit_usd,
              sent,
            );
          }

          return res.status(429).json({
            error: "Daily budget exceeded",
            budget_limit: budget.daily_limit_usd,
            current_spend: todaySpend,
            message: `You've spent $${todaySpend.toFixed(4)} today. Daily limit is $${budget.daily_limit_usd}.`,
          });
        }
      }

      // Same for monthly
      if (budget.monthly_limit_usd) {
        const monthSpend = await getMonthSpend(customerApiKey);

        if (monthSpend >= budget.monthly_limit_usd) {
          const recentAlert = await getRecentAlert(
            customerApiKey,
            "budget_exceeded",
            "monthly",
          );

          if (!recentAlert && budget.alert_email) {
            const alert = formatCostAlert(
              customerApiKey,
              monthSpend,
              budget.monthly_limit_usd,
              "monthly",
            );
            const sent = await sendAlert(
              budget.alert_email,
              alert.subject,
              alert.text,
              alert.html,
            );
            await logAlert(
              customerApiKey,
              "budget_exceeded",
              "monthly",
              monthSpend,
              budget.monthly_limit_usd,
              sent,
            );
          }

          return res.status(429).json({
            error: "Monthly budget exceeded",
            budget_limit: budget.monthly_limit_usd,
            current_spend: monthSpend,
            message: `You've spent $${monthSpend.toFixed(4)} this month. Monthly limit is $${budget.monthly_limit_usd}.`,
          });
        }
      }
    }

    // Forward request to Anthropic
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      req.body,
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      },
    );
    const duration = Date.now() - startTime;
    const usage = response.data.usage;
    const model = req.body.model;

    // Calculate cost
    const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

    // Log to database
    logRequest({
      customerApiKey,
      agentId,
      timestamp: Date.now(),
      model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      duration,
      status: "success",
    }).catch((err) => console.error("Failed to log request:", err));

    // Add cost info to response headers
    res.setHeader("X-Cost-Input-USD", cost.inputCost.toFixed(6));
    res.setHeader("X-Cost-Output-USD", cost.outputCost.toFixed(6));
    res.setHeader("X-Cost-Total-USD", cost.totalCost.toFixed(6));
    res.setHeader("X-Agent-ID", agentId); // NEW: Return agent ID in response

    // Return Anthropic's response
    res.json(response.data);
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log failed request - NOW WITH AGENT ID
    logRequest({
      customerApiKey,
      agentId, // NEW: Include agent ID
      timestamp: Date.now(),
      model: req.body.model || "unknown",
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      duration,
      status: "error",
    }).catch((err) => console.error("Failed to log error:", err));

    // Forward Anthropic's error
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Cost Proxy running on port ${PORT}`);
  console.log(`📊 Database initialized`);
  console.log(`💰 Ready to track costs`);
});

// Mock endpoint for testing
app.post("/v1/messages/mock", async (req, res) => {
  const startTime = Date.now();
  const customerApiKey = req.headers["x-api-key"];
  const agentId = req.headers["x-agent-id"] || "default"; // NEW: Extract agent ID

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock response
  const mockResponse = {
    id: "msg_mock123",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "This is a mock response for testing." }],
    model: req.body.model,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
    },
  };

  const duration = Date.now() - startTime;
  const cost = calculateCost(req.body.model, 10, 20);

  // Log to database - NOW WITH AGENT ID
  await logRequest({
    customerApiKey,
    agentId,
    timestamp: Date.now(),
    model: req.body.model,
    inputTokens: 10,
    outputTokens: 20,
    inputCost: cost.inputCost,
    outputCost: cost.outputCost,
    totalCost: cost.totalCost,
    duration,
    status: "success",
  });

  res.setHeader("X-Cost-Total-USD", cost.totalCost.toFixed(6));
  res.setHeader("X-Agent-ID", agentId);
  res.json(mockResponse);
});

// Dashboard API - view costs by customer

// Dashboard API - view costs by customer
// EXPANDED DEMO DATA - 50 entries for realistic demo
const DEMO_DATA = {
  requests: [
    {
      agentId: "support-bot",
      cost: 3.42,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "sales-assistant",
      cost: 1.18,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "content-writer",
      cost: 5.67,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "code-reviewer",
      cost: 2.34,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 4.21,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "email-responder",
      cost: 0.89,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "data-analyzer",
      cost: 6.45,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 2.87,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "sales-assistant",
      cost: 1.45,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "doc-generator",
      cost: 3.21,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 3.89,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    },
    {
      agentId: "qa-assistant",
      cost: 1.56,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      agentId: "translator",
      cost: 0.67,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      agentId: "summarizer",
      cost: 0.45,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      agentId: "research-bot",
      cost: 4.32,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 2.98,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    },
    {
      agentId: "content-writer",
      cost: 4.56,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    },
    {
      agentId: "email-responder",
      cost: 0.78,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
    },
    {
      agentId: "data-analyzer",
      cost: 5.43,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 220 * 60 * 1000).toISOString(),
    },
    {
      agentId: "sales-assistant",
      cost: 1.67,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    },
    {
      agentId: "code-reviewer",
      cost: 3.12,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 260 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 3.45,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 280 * 60 * 1000).toISOString(),
    },
    {
      agentId: "doc-generator",
      cost: 2.89,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    },
    {
      agentId: "translator",
      cost: 0.56,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 320 * 60 * 1000).toISOString(),
    },
    {
      agentId: "summarizer",
      cost: 0.34,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 340 * 60 * 1000).toISOString(),
    },
    {
      agentId: "research-bot",
      cost: 5.67,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    },
    {
      agentId: "qa-assistant",
      cost: 1.89,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 380 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 4.12,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 400 * 60 * 1000).toISOString(),
    },
    {
      agentId: "content-writer",
      cost: 3.78,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 420 * 60 * 1000).toISOString(),
    },
    {
      agentId: "email-responder",
      cost: 0.91,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 440 * 60 * 1000).toISOString(),
    },
    {
      agentId: "data-analyzer",
      cost: 6.23,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 460 * 60 * 1000).toISOString(),
    },
    {
      agentId: "sales-assistant",
      cost: 1.34,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    },
    {
      agentId: "code-reviewer",
      cost: 2.67,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 500 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 3.56,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 520 * 60 * 1000).toISOString(),
    },
    {
      agentId: "doc-generator",
      cost: 4.12,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 540 * 60 * 1000).toISOString(),
    },
    {
      agentId: "translator",
      cost: 0.62,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 560 * 60 * 1000).toISOString(),
    },
    {
      agentId: "summarizer",
      cost: 0.48,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 580 * 60 * 1000).toISOString(),
    },
    {
      agentId: "research-bot",
      cost: 5.89,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    },
    {
      agentId: "qa-assistant",
      cost: 1.78,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 620 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 4.34,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 640 * 60 * 1000).toISOString(),
    },
    {
      agentId: "content-writer",
      cost: 5.12,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 660 * 60 * 1000).toISOString(),
    },
    {
      agentId: "email-responder",
      cost: 0.87,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 680 * 60 * 1000).toISOString(),
    },
    {
      agentId: "data-analyzer",
      cost: 6.78,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 700 * 60 * 1000).toISOString(),
    },
    {
      agentId: "sales-assistant",
      cost: 1.56,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 720 * 60 * 1000).toISOString(),
    },
    {
      agentId: "code-reviewer",
      cost: 2.45,
      model: "claude-sonnet-4",
      timestamp: new Date(Date.now() - 740 * 60 * 1000).toISOString(),
    },
    {
      agentId: "support-bot",
      cost: 3.67,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 760 * 60 * 1000).toISOString(),
    },
    {
      agentId: "doc-generator",
      cost: 3.89,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 780 * 60 * 1000).toISOString(),
    },
    {
      agentId: "translator",
      cost: 0.71,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 800 * 60 * 1000).toISOString(),
    },
    {
      agentId: "summarizer",
      cost: 0.52,
      model: "claude-haiku-4",
      timestamp: new Date(Date.now() - 820 * 60 * 1000).toISOString(),
    },
    {
      agentId: "research-bot",
      cost: 5.23,
      model: "claude-opus-4",
      timestamp: new Date(Date.now() - 840 * 60 * 1000).toISOString(),
    },
  ],
};

app.get("/api/costs/:apiKey", (req, res) => {
  const { apiKey } = req.params;

  if (apiKey === "demo-customer") {
    return res.json(DEMO_DATA);
  }

  db.all(
    `SELECT 
      DATE(timestamp/1000, 'unixepoch') as date,
      COUNT(*) as request_count,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      ROUND(SUM(total_cost_usd), 6) as daily_cost_usd
    FROM requests 
    WHERE customer_api_key = ? AND status = 'success'
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30`,
    [apiKey],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const totalCost = rows.reduce((sum, row) => sum + row.daily_cost_usd, 0);
      const totalRequests = rows.reduce(
        (sum, row) => sum + row.request_count,
        0,
      );

      res.json({
        apiKey,
        summary: {
          total_requests: totalRequests,
          total_cost_usd: totalCost.toFixed(6),
        },
        daily_breakdown: rows,
      });
    },
  );
});

// Get all costs (admin view)
app.get("/api/costs", (req, res) => {
  db.all(
    `SELECT 
      customer_api_key,
      COUNT(*) as total_requests,
      ROUND(SUM(total_cost_usd), 6) as total_cost_usd,
      MAX(timestamp) as last_request_timestamp
    FROM requests 
    WHERE status = 'success'
    GROUP BY customer_api_key
    ORDER BY total_cost_usd DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ customers: rows });
    },
  );
});

// NEW: Get costs by agent for a customer
app.get("/api/costs/:apiKey/agents", (req, res) => {
  const { apiKey } = req.params;

  db.all(
    `SELECT 
      agent_id,
      COUNT(*) as total_requests,
      ROUND(SUM(total_cost_usd), 6) as total_cost_usd,
      MAX(timestamp) as last_request_timestamp
    FROM requests 
    WHERE customer_api_key = ? AND status = 'success'
    GROUP BY agent_id
    ORDER BY total_cost_usd DESC`,
    [apiKey],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ agents: rows });
    },
  );
});

// Get budget for a customer
app.get("/api/budget/:apiKey", async (req, res) => {
  try {
    const budget = await getBudget(req.params.apiKey);
    const todaySpend = await getTodaySpend(req.params.apiKey);
    const monthSpend = await getMonthSpend(req.params.apiKey);

    res.json({
      budget: budget || { daily_limit_usd: null, monthly_limit_usd: null },
      current_spend: {
        today: todaySpend,
        month: monthSpend,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set budget for a customer
app.post("/api/budget/:apiKey", async (req, res) => {
  try {
    const { daily_limit, monthly_limit, alert_email } = req.body;

    await setBudget(
      req.params.apiKey,
      daily_limit || null,
      monthly_limit || null,
      alert_email || null,
    );

    res.json({
      success: true,
      message: "Budget updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic reports available in Costile Cloud
app.get("/api/diagnose/:apiKey", (req, res) => {
  res.json({
    message: "Diagnostic reports are available in Costile Cloud.",
    info: "Loop detection, model waste analysis, and cost spike attribution are part of the Cloud tier.",
    waitlist: "https://costile.com",
  });
});
