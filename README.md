# 💰 Costile — AI Agent Diagnostics

> Your agents are burning money. We know why.

Born from [this All-In Podcast discussion](https://x.com/theallinpod/status/2024157675538243661) where Jason Calacanis revealed that teams were hitting $300/day per agent using the Claude API — $100K/year, per agent — and didn't see it coming.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Live Demo

**Website:** [https://costile.com](https://costile.com)

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
# Use: https://costile.com/v1/messages

curl -X POST https://costile.com/v1/messages \
  -H "x-api-key: YOUR-UNIQUE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

View your costs at: `https://costile.com`

---

## 🎯 Why This Exists

Provider dashboards tell you what your agents spent. They don't tell you why.

Costile is an **AI agent diagnostic layer** that sits between your app and the AI API. It tracks every token in real time, enforces hard budget caps, and — crucially — tells you exactly why your costs spiked. Loop detected. Model overkill flagged. Tool overuse identified. Fix recommended.

✅ **Real-time cost tracking** — See costs as they happen, not hours later  
✅ **Hard budget enforcement** — Requests blocked the moment you hit your cap. No exceptions.  
✅ **Per-agent tracking** — Know exactly which agent is burning money  
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
- [ ] Email / Slack alerts
- [ ] OpenAI support
- [ ] Diagnostic reports — loop detection, model waste, cost spike attribution _(Costile Cloud — [costile.com](https://costile.com))_
- [ ] Agent efficiency recommendations _(Costile Cloud)_
- [ ] Managed cloud hosting _(Costile Cloud — [join waitlist](https://costile.com))_

---

## 🆚 Costile vs. Provider Dashboards

| Feature             | OpenAI / Anthropic | Costile                             |
| ------------------- | ------------------ | ----------------------------------- |
| Cost updates        | Delayed            | **Real-time**                       |
| Why costs spiked    | ✗ Never            | **Loop, model waste, tool overuse** |
| Budget enforcement  | ✗ None             | **Hard caps**                       |
| Per-agent tracking  | ✗ Not supported    | **Per agent, per session**          |
| Fix recommendations | ✗ Not available    | **Specific, costed, actionable**    |
| Open source         | ✗ Closed           | **MIT licensed**                    |

---

## 💰 Pricing

| Tier                          | Price        | Status           |
| ----------------------------- | ------------ | ---------------- |
| **Free** (self-hosted)        | $0 / forever | ✅ Available now |
| **Basic** (managed hosting)   | $19 / month  | Coming soon      |
| **Pro** (diagnostics + teams) | $49 / month  | Coming soon      |
| **Enterprise**                | Custom       | Coming soon      |

Self-hosting is and will always be free and open source. The paid tiers cover managed hosting, uptime SLA, team access, Slack/Discord alerts, and the full diagnostic engine. [Join the waitlist](https://costile.com) for early access.

---

## 🏗️ Architecture

```
Your App → Costile Proxy → Anthropic API
               ↓
          Cost Tracking DB
               ↓
          Dashboard + Diagnostics
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
- JavaScript + Python SDK

**Costile Cloud (coming soon):**

- Diagnostic reports (loop detection, model waste, cost spike attribution)
- Agent efficiency recommendations
- Multi-provider unified dashboard
- Team management & RBAC
- Enterprise features (SSO, audit logs, SOC 2)

---

## ❓ FAQ

**What is Costile?**  
Costile is an AI agent diagnostic layer that sits between your application and AI APIs like Anthropic and OpenAI. It tracks every request in real time, enforces hard budget caps, and tells you _why_ your costs spiked — loop detected, model overkill flagged, tool overuse identified.

**Which AI providers does Costile support?**  
Currently Anthropic's Claude API. OpenAI support is coming soon.

**Is my API data secure?**  
With self-hosting, your data never leaves your infrastructure. Costile only logs metadata (cost, tokens, timestamps) — never prompts or responses. Your API keys stay in your environment variables and are never exposed or stored.

**Self-hosted vs. Cloud — what's the difference?**  
Self-hosted (free, open source) gives you real-time cost tracking and hard budget enforcement. The Cloud version adds the full diagnostic engine — loop detection, model waste analysis, cost spike attribution, fix recommendations, and managed hosting.

---

## 🤝 Contributing

Contributions are welcome!

```bash
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
