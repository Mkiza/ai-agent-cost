const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

async function sendAlert(to, subject, text, html) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("⚠️  SendGrid not configured, skipping email");
    return false;
  }

  if (!process.env.FROM_EMAIL) {
    console.log("⚠️  FROM_EMAIL not configured, skipping email");
    return false;
  }

  try {
    await sgMail.send({
      to,
      from: process.env.FROM_EMAIL, // Must be verified in SendGrid
      subject,
      text,
      html,
    });
    console.log(`✅ Alert sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return false;
  }
}

function formatCostAlert(apiKey, spend, limit, period) {
  const subject = `⚠️ AI Cost Alert: Budget ${period} exceeded`;

  const text = `
Alert: Your AI agent costs have exceeded the ${period} budget.

API Key: ${apiKey}
Current Spend: $${spend.toFixed(4)}
Budget Limit: $${limit.toFixed(4)}
Overage: $${(spend - limit).toFixed(4)}

Next requests will be blocked until the ${period} resets.

View dashboard: https://ai-agent-cost-production.up.railway.app
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">⚠️ AI Cost Alert</h1>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333;">Budget ${period} Exceeded</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>API Key:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${apiKey}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Current Spend:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #ef4444;"><strong>$${spend.toFixed(4)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Budget Limit:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">$${limit.toFixed(4)}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Overage:</strong></td>
              <td style="padding: 10px; color: #ef4444;"><strong>+$${(spend - limit).toFixed(4)}</strong></td>
            </tr>
          </table>
        </div>
        
        <p style="color: #666;">
          Your next API requests will be blocked until the ${period} period resets.
        </p>
        
        <a href="https://ai-agent-cost-production.up.railway.app" 
           style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 8px; margin-top: 20px;">
          View Dashboard
        </a>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
        <p>AI Agent Cost Monitor | <a href="https://github.com/Mkiza/ai-agent-cost" style="color: #667eea;">Open Source</a></p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { sendAlert, formatCostAlert };
