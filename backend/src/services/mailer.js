const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.MAILER_GMAIL) return null;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAILER_GMAIL,
      pass: process.env.MAILER_PASS,
    },
  });
  return transporter;
}

async function sendOutsideInvite({ to, url, studentName, workflowTitle }) {
  const subject = `طلب اعتماد إشراف — ${workflowTitle || ""}`;
  const html = `
    <div dir="rtl" style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:15px; color:#111; line-height:1.6">
      <p>مرحبًا،</p>
      <p>لقد تم إضافتكم كمشرف خارجي على طالب: <b>${studentName || ""}</b>.</p>
      <p>للاطلاع على الطلب والرد عليه — لا حاجة لتسجيل الدخول — اضغطوا على الرابط التالي:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">فتح الطلب</a></p>
      <p style="color:#555;font-size:12px;word-break:break-all">${url}</p>
    </div>
  `;
  const text = `طلب اعتماد إشراف\n\n${url}\n`;

  const from = process.env.MAILER_GMAIL || "no-reply@docuflow.local";

  console.log("SENT EMAIL", from, to);

  const tx = getTransporter();
  if (!tx) {
    // Dev fallback — visible in server logs.
    console.log(
      `[mailer:dev] would send outside-invite to ${to}\n  subject: ${subject}\n  url: ${url}`,
    );
    return;
  }
  await tx.sendMail({ from, to, subject, html, text });
}

module.exports = { sendOutsideInvite };
