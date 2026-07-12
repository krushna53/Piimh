const axios = require("axios");

/**
 * Email transport — PLACEHOLDER, not wired to a real provider yet.
 *
 * Everything above this function (which events trigger an alert, who they
 * go to, subject/body content) is complete and correct. This is the only
 * piece left to fill in once a provider is chosen — Nodemailer+SMTP,
 * SendGrid, AWS SES, Resend, Postmark, etc. all just need their API call
 * dropped in here; nothing else in this file or the callers needs to change.
 *
 * Until then, this logs what *would* have been sent so the alerting logic
 * is fully testable end-to-end without any provider configured.
 *
 * @param {{ to: string[], subject: string, text: string }} message
 */
const deliverEmail = async ({ to, subject, text }) => {
  console.log(
    `[EMAIL ALERT — NOT SENT: no email provider wired up yet]\n` +
      `To: ${to.join(", ")}\nSubject: ${subject}\n---\n${text}\n---`
  );

  // TODO: replace this block with a real provider call once one is chosen, e.g.:
  //   Nodemailer (SMTP):
  //     const info = await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text });
  //   SendGrid:
  //     await sgMail.send({ to, from: FROM_ADDRESS, subject, text });
  //   AWS SES:
  //     await sesClient.send(new SendEmailCommand({ ... }));
  //   Resend:
  //     await resend.emails.send({ from: FROM_ADDRESS, to, subject, text });
};

/**
 * Email channel. No-op unless SECURITY_ALERT_EMAIL_TO is set — comma
 * separated list of recipient addresses, e.g.
 * "security@piimh.com,krushnawebworks@gmail.com".
 */
const sendEmailAlert = async (eventType, details) => {
  const recipients = (process.env.SECURITY_ALERT_EMAIL_TO || "")
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);

  if (!recipients.length) return;

  const subject = `[Payment Security Alert] ${eventType}`;
  const lines = Object.entries(details)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const text =
    `A payment security event was detected on ${process.env.URL || "the payment app"}.\n\n` +
    `Event: ${eventType}\n` +
    `Time (UTC): ${new Date().toISOString()}\n\n` +
    `${lines}`;

  try {
    await deliverEmail({ to: recipients, subject, text });
  } catch (err) {
    console.warn("Security alert email delivery failed:", err.message);
  }
};

/**
 * Webhook channel (Slack/Mattermost-compatible). Kept available but dormant
 * — only fires if SECURITY_ALERT_WEBHOOK_URL is explicitly set. Not the
 * active channel right now (email is), but no reason to rip it out in case
 * it's useful alongside email later.
 */
const sendWebhookAlert = async (eventType, details) => {
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines = Object.entries(details)
    .map(([key, value]) => `• *${key}:* ${value}`)
    .join("\n");
  const text = `:rotating_light: *Payment security alert — ${eventType}*\n${lines}`;

  try {
    await axios.post(webhookUrl, { text }, { timeout: 3000 });
  } catch (err) {
    console.warn("Security alert webhook delivery failed:", err.message);
  }
};

/**
 * Fire security alerts across every configured channel for a
 * security-relevant event: amount tampering, forged/unverifiable payment
 * callbacks, unauthorized transaction-log access, etc.
 *
 * Always logs to console regardless of configuration (so events stay
 * greppable in Netlify function logs even with zero channels set up).
 * Each channel is independently optional and silently no-ops if not
 * configured — this function never throws and never blocks the caller
 * for long, so a broken alert channel can't take down the payment flow.
 *
 * @param {string} eventType short machine-readable label, e.g. "AMOUNT_MISMATCH"
 * @param {Record<string, any>} details key/value context to include
 */
const sendSecurityAlert = async (eventType, details = {}) => {
  console.error(`[SECURITY ALERT] ${eventType}`, JSON.stringify(details));

  await Promise.allSettled([
    sendEmailAlert(eventType, details),
    sendWebhookAlert(eventType, details),
  ]);
};

module.exports = { sendSecurityAlert };
