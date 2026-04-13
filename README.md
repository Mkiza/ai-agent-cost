# 💰 Costile — AI Agent Cost Monitor

> Real-time cost tracking and hard budget enforcement for AI agents. Your AI agents are burning money. You'll know in 6 hours — unless you use Costile.

Born from [this All-In Podcast discussion](https://x.com/theallinpod/status/2024157675538243661) where Jason Calacanis revealed that teams were hitting $300/day per agent using the Claude API — $100K/year, per agent — and didn't see it coming.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Live Demo

**Website:** [https://costile.com](https://costile.com)

**Dashboard:** [https://ai-agent-cost-production.up.railway.app](https://ai-agent-cost-production.up.railway.app)

Try it with API key: `demo-customer`

---

## ⚡ Quick Start

### Option 1: Self-Host (Recommended for Production)

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

### Option 2: Use Hosted Version

Point your Anthropic API calls to the Costile proxy:

```bash
# Instead of: https://api.anthropic.com/v1/messages
# Use: https://ai-agent-cost-production.up.railway.app/v1/messages

curl -X POST https://ai-agent-cost-production.up.railway.app/v1/messages \
  -H "x-api-key: YOUR-UNIQUE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

View your costs at: `https://ai-agent-cost-production.up.railway.app`

---

## 🎯 Why This Exists

### The Problem

A lot can go wrong in 6 hours:

- **8:00 AM** — You ship a new AI agent to production. Everything looks fine.
- **9:15 AM** — An edge case triggers a retry loop. Your agent starts hammering the API.
- **11:30 AM** — 10,000 requests later, your bill reads $127. You have no idea.
- **2:00 PM** — The provider dashboard finally refreshes. You're $77 over budget.

Provider dashboards update every 6 hours. By the time you see the number, the damage is done.

### The Solution

Costile is a **real-time cost proxy** that sits between your app and the AI API. It tracks every token, enforces hard budget caps, and kills runaway spend — instantly.

✅ **Real-time cost tracking** — See costs as they happen, not hours later  
✅ **Hard budget enforcement** — Requests blocked the moment you hit your cap. No exceptions.  
✅ **Per-agent/team tracking** — Know exactly which agent is burning money  
✅ **Visual dashboard** — Live costs, daily breakdowns, token analytics  
✅ **Privacy-first** — Only metadata is logged. Prompts and responses are never stored.  
✅ **Open source (MIT)** — Audit the code, self-host, contribute

---

## 📊 Features

- [x] Real-time cost calculation per request
- [x] Per-customer API key tracking
- [x] Hard budget caps (daily and monthly)
- [x] Visual dashboard with cost breakdowns
- [x] Token usage analytics
- [x] Multi-agent support
- [x] SQLite database (easy Postgres migration)
- [ ] Email alerts
- [ ] Slack / Discord alerts
- [ ] OpenAI support
- [ ] Cost forecasting & anomaly detection
- [ ] Managed cloud hosting (join the waitlist at [costile.com](https://costile.com))

---

## 🆚 Costile vs. Provider Dashboards

| Feature | OpenAI / Anthropic | Costile |
|---|---|---|
| Cost updates | Every 6 hours | **Real-time** |
| Budget enforcement | None | **Hard caps** |
| Per-agent tracking | Not supported | **Per agent** |
| Instant alerts | Email (delayed) | **Real-time block** |
| Custom limits | Not available | **Per agent / model / time** |

---

## 💰 Pricing

| Tier | Price | Status |
|---|---|---|
| **Free** (self-hosted) | $0 / forever | ✅ Available now |
| **Basic** (managed hosting) | $19 / month | Coming soon |
| **Pro** (teams + analytics) | $49 / month | Coming soon |
| **Enterprise** | Custom | Coming soon |

Self-hosting is and will always be free and open source. The paid tiers cover managed hosting, uptime SLA, team access, Slack/Discord alerts, and advanced analytics. [Join the waitlist](https://costile.com) for early access.

---

## 🏗️ Architecture

```
Your App → Costile Proxy → Anthropic API
               ↓
          Cost Tracking DB
               ↓
          Dashboard UI
```

**Privacy:** Only metadata is logged (tokens, cost, timestamp). Prompts and responses flow through but are **never stored**.

---

## 🔒 Privacy & Security

### What We Track

- Request timestamp
- Model used
- Token counts (input / output)
- Calculated cost
- Your customer API key (for multi-tenant tracking)

### What We DON'T Track

- ❌ Your prompts
- ❌ Claude's responses
- ❌ Any message content
- ❌ Your Anthropic API key

All code is open source — audit it yourself or self-host with full control.

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (easy Postgres migration)
- **Frontend:** Vanilla JS + Chart.js
- **Deployment:** Railway (or any Node.js host)

---

## 📈 Roadmap

**Near-term:**
- Email / Slack / Discord alerts
- OpenAI support
- JavaScript + Python SDK for client-side tracking
- Cost optimization recommendations

**Future:**
- Multi-provider unified dashboard
- Team management & RBAC
- Anomaly detection
- Enterprise features (SSO, audit logs, SOC 2)
- Managed cloud hosting (costile.com waitlist)

---

## ❓ FAQ

**Which AI providers does Costile support?**  
Currently Anthropic's Claude API. OpenAI support is coming soon. The architecture is designed to support any provider — open an issue on GitHub if you need a specific one.

**Is my API data secure?**  
With self-hosting, your data never leaves your infrastructure. Costile only logs metadata (cost, tokens, timestamps) — never prompts or responses. Your API keys stay in your environment variables and are never exposed or stored. The code is fully open source (MIT) so you can audit everything.

**Self-hosted vs. Cloud — what's the difference?**  
Self-hosted (free, open source) runs on your own infrastructure — you manage it, you own the data. The Cloud version (coming soon) is fully managed: hosting, updates, uptime SLA, and additional features like email/Slack alerts, team collaboration, and advanced analytics. Same core technology either way.

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a PR
```

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by the [All-In Podcast discussion](https://x.com/theallinpod/status/2024157675538243661) on AI agent costs
- Built in Copenhagen 🇩🇰 by [@Mkiza](https://github.com/Mkiza)

---

**⭐ If this saves you from a surprise bill, a star goes a long way.**

Questions or issues? [Open an issue](https://github.com/Mkiza/ai-agent-cost/issues) or reach out via GitHub.
