const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function isMailConfigured() {
  return Boolean(env.mail.host && env.mail.port && env.mail.user && env.mail.pass && env.mail.fromEmail);
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error("Chưa cấu hình SMTP để gửi email phản hồi");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass
      }
    });
  }

  return transporter;
}

async function sendContactReplyMail({
  to,
  customerName,
  originalSubject,
  originalMessage,
  replyMessage,
  shopName,
  contactEmail
}) {
  const activeTransporter = getTransporter();
  const brandName = String(shopName || env.mail.fromName || "THE BIG GYM").trim();
  const emailSubject = originalSubject
    ? `${brandName} phản hồi: ${originalSubject}`
    : `${brandName} phản hồi lời nhắn của bạn`;

  const text = [
    `Xin chào ${customerName || "bạn"},`,
    "",
    replyMessage,
    "",
    originalMessage ? "Lời nhắn trước đó của bạn:" : "",
    originalMessage || "",
    "",
    `Trân trọng,`,
    brandName,
    contactEmail ? `Email liên hệ: ${contactEmail}` : ""
  ].filter(Boolean).join("\n");

  const html = `
    <div style="background:#111111;padding:32px 18px;font-family:Arial,sans-serif;color:#f5f1e8;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);background:#181818;">
        <div style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#f2ca50;">${escapeHtml(brandName)}</div>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Phản hồi liên hệ</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#d9d2c3;">Xin chào ${escapeHtml(customerName || "bạn")},</p>
          <div style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#f5f1e8;">${nl2br(replyMessage)}</div>
          ${originalMessage ? `
            <div style="margin-top:24px;padding:18px;border:1px solid rgba(255,255,255,0.08);background:#121212;">
              <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f2ca50;">Lời nhắn gốc</div>
              ${originalSubject ? `<div style="margin-top:12px;font-size:13px;font-weight:700;color:#ffffff;">${escapeHtml(originalSubject)}</div>` : ""}
              <div style="margin-top:10px;font-size:14px;line-height:1.8;color:#c9c2b5;">${nl2br(originalMessage)}</div>
            </div>
          ` : ""}
          <div style="margin-top:28px;font-size:14px;line-height:1.8;color:#d9d2c3;">
            Trân trọng,<br />
            <strong style="color:#ffffff;">${escapeHtml(brandName)}</strong>
            ${contactEmail ? `<br />${escapeHtml(contactEmail)}` : ""}
          </div>
        </div>
      </div>
    </div>
  `;

  await activeTransporter.sendMail({
    from: `"${brandName.replace(/"/g, "")}" <${env.mail.fromEmail}>`,
    to,
    replyTo: contactEmail || env.mail.fromEmail,
    subject: emailSubject,
    text,
    html
  });
}

module.exports = {
  isMailConfigured,
  sendContactReplyMail
};
