require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { logRequest } = require("./database");
const { calculateCost } = require("./pricing");

const app = express();
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

    // Log to database (don't wait for it)
    logRequest({
      customerApiKey,
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

    // Return Anthropic's response
    res.json(response.data);
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log failed request
    logRequest({
      customerApiKey,
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

  // Log to database
  await logRequest({
    customerApiKey,
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
  res.json(mockResponse);
});

// Dashboard endpoint - view costs
app.get("/api/costs/:apiKey", async (req, res) => {
  const { apiKey } = req.params;

  db.all(
    `SELECT 
      DATE(timestamp/1000, 'unixepoch') as date,
      COUNT(*) as request_count,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_cost_usd) as daily_cost
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
      res.json({ apiKey, costs: rows });
    },
  );
});
