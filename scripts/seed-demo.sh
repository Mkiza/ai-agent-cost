#!/bin/bash

# Configuration
API_URL="${1:-https://ai-agent-cost-production.up.railway.app}"
API_KEY="demo-customer"
NUM_REQUESTS=25

echo "🌱 Seeding demo data to $API_URL"
echo "📊 Creating $NUM_REQUESTS sample requests..."
echo ""

# Array of sample prompts for variety
prompts=(
  "Explain quantum computing in one sentence"
  "Write a haiku about AI"
  "List 3 benefits of cloud computing"
  "What is machine learning?"
  "Translate hello to Spanish"
  "Calculate 15 percent of 200"
  "Summarize the concept of APIs"
  "What are the benefits of TypeScript?"
  "Explain REST vs GraphQL"
  "What is Docker used for?"
)

success_count=0
fail_count=0

for i in $(seq 1 $NUM_REQUESTS); do
  # Random prompt from array
  prompt_index=$((i % ${#prompts[@]}))
  prompt="${prompts[$prompt_index]}"
  
  # Random token count between 50-200
  max_tokens=$((50 + RANDOM % 150))
  
  # Make request (fixed: proper JSON escaping)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/v1/messages" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":'$max_tokens',"messages":[{"role":"user","content":"'"$prompt"'"}]}')
  
  if [ "$http_code" -eq 200 ]; then
    success_count=$((success_count + 1))
    echo "✅ Request $i/$NUM_REQUESTS - Success (${max_tokens} tokens)"
  else
    fail_count=$((fail_count + 1))
    echo "❌ Request $i/$NUM_REQUESTS - Failed (HTTP $http_code)"
  fi
  
  # Small delay to avoid rate limits
  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Demo data seeding complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Success: $success_count requests"
echo "❌ Failed: $fail_count requests"
echo ""
echo "🎯 View the dashboard at:"
echo "   $API_URL"
echo ""
echo "🔑 Enter this API key to see demo data:"
echo "   demo-customer"
echo ""