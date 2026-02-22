# 💰 AI Agent Cost Monitor

> Real-time cost tracking and budget enforcement for AI agents - so you never wake up to a $50K surprise bill.

Born from [this All-In Podcast discussion](https://x.com/theallinpod/status/2024157675538243661) where Jason Calacanis revealed: _"We hit $300/day per agent using the Claude API, like instantly. That's $100K/year per agent."_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Live Demo

**Dashboard:** [https://ai-agent-cost-production.up.railway.app](https://ai-agent-cost-production.up.railway.app)

Try it with API key: `demo-customer`

## ⚡ Quick Start

### Option 1: Use Hosted Version (Free Beta)

Point your Anthropic API calls to our proxy:

```bash
# Instead of: https://api.anthropic.com/v1/messages
# Use: https://ai-agent-cost-production.up.railway.app/v1/messages

curl -X POST https://ai-agent-cost-production.up.railway.app/v1/messages \
  -H "x-api-key: YOUR-UNIQUE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

View your costs at: `https://ai-agent-cost-production.up.railway.app`

### Option 2: Self-Host (Recommended for Production)

```bash
# Clone the repo
git clone https://github.com/Mkiza/ai-agent-cost.git
cd ai-agent-cost

# Install dependencies
npm install

# Set your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Run locally
npm run dev

# Open dashboard at http://localhost:3000
```

## 🎯 Why This Exists

### The Problem

AI agents can burn through your budget **fast**:

- No real-time visibility into costs
- Billing dashboards update hours/days later
- Can't track costs per agent/team/project
- No way to set budget caps
- Surprise bills of $10K-$50K+ are common

### The Solution

**AI Agent Cost Monitor** gives you:

✅ **Real-time cost tracking** - See costs as they happen, not days later  
✅ **Per-agent/team tracking** - Know exactly which agent is expensive  
✅ **Budget enforcement** - Set caps to prevent runaway spending (coming soon)  
✅ **Visual dashboard** - Charts, trends, daily breakdowns  
✅ **Privacy-first** - We don't log your prompts or responses  
✅ **Open source** - Audit the code, self-host, or use our hosted version

## 📊 Features

- [x] Real-time cost calculation per request
- [x] Per-customer API key tracking
- [x] Visual dashboard with charts
- [x] Daily/weekly cost breakdowns
- [x] Token usage analytics
- [x] SQLite database (easy to migrate to Postgres)
- [ ] Email alerts (coming this week)
- [ ] Budget caps (coming this week)
- [ ] OpenAI support (coming soon)
- [ ] Slack integration (coming soon)

## 🏗️ Architecture

```
Your App → AI Cost Monitor Proxy → Anthropic API
              ↓
         Cost Tracking DB
              ↓
         Dashboard UI
```

**Privacy:** We only log metadata (tokens, cost, timestamp). Your prompts and responses flow through but are **never stored**.

## 🔒 Privacy & Security

### What We Track

- Request timestamp
- Model used
- Token counts (input/output)
- Cost (calculated)
- Your API key (for multi-tenant tracking)

### What We DON'T Track

- ❌ Your prompts
- ❌ Claude's responses
- ❌ Any actual message content
- ❌ Your Anthropic API key

**All code is open source** - audit it yourself or self-host.

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (easy Postgres migration)
- **Frontend:** Vanilla JS + Chart.js
- **Deployment:** Railway (or any Node.js host)

## 📈 Roadmap

**This Week:**

- [ ] Email/Slack alerts
- [ ] Budget caps (hard stops at $X/day)
- [ ] Dockerfile for easy self-hosting

**Next Week:**

- [ ] OpenAI support
- [ ] JavaScript/Python SDK (client-side tracking)
- [ ] Cost optimization recommendations

**Future:**

- [ ] Multi-provider unified dashboard
- [ ] Team management & RBAC
- [ ] Anomaly detection (ML-based)
- [ ] Enterprise features (SSO, audit logs)

## 🤝 Contributing

This is an open source project! Contributions welcome.

```bash
# Fork the repo
# Create a feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m "Add amazing feature"

# Push and open a PR
git push origin feature/amazing-feature
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [All-In Podcast discussion](https://x.com/theallinpod/status/2024157675538243661) on AI agent costs
- Built over a weekend in Copenhagen 🇩🇰

## 📧 Contact

Built by [@Mkiza](https://github.com/Mkiza)

Questions? Issues? [Open an issue](https://github.com/Mkiza/ai-agent-cost/issues) or reach out!

---

**⭐ If this saves you from a surprise $50K bill, give us a star!**

## 🙏 Attribution

If you use this code, we'd appreciate:

- ⭐ A star on GitHub
- 🔗 A link back to this repo
- 💬 Mentioning @Mkiza if you tweet about it

Not required, but helps us grow! 🚀
