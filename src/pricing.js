// Pricing per million tokens (USD)
const PRICING = {
  "claude-opus-4-5-20251101": {
    input: 15,
    output: 75,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
  },
  "claude-haiku-4-5-20251001": {
    input: 0.8,
    output: 4,
  },
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = PRICING[model];

  if (!pricing) {
    console.warn(`Unknown model: ${model}, using Sonnet pricing`);
    return calculateCost(
      "claude-sonnet-4-5-20250929",
      inputTokens,
      outputTokens
    );
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

module.exports = { calculateCost, PRICING };
