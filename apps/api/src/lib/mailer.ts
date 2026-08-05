import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpUser || !smtpPass) {
  throw new Error("SMTP_USER and SMTP_PASS must be defined");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"Deli Cocktail House" <${smtpUser}>`,
    to,
    subject: "Your Deli Cocktail House Login Verification Code",

    text: `
Deli Cocktail House

Your One-Time Password (OTP) is:

${otp}

This code is valid for 5 minutes.

If you did not request this login, you can safely ignore this email.

Regards,
Deli Cocktail House
    `,

    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;margin:40px auto;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.08);">

<!-- Header -->
<tr>
<td
style="background:linear-gradient(135deg,#111827,#1f2937);padding:32px;text-align:center;">

<h1 style="margin:0;color:#fff;font-size:28px;">
🍸 Deli Cocktail House
</h1>

<p style="margin-top:10px;color:#d1d5db;font-size:15px;">
Catering ERP Management System
</p>

</td>
</tr>

<!-- Body -->

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#111827;">
Login Verification
</h2>

<p style="font-size:16px;color:#4b5563;line-height:1.6;">
Hello,
</p>

<p style="font-size:16px;color:#4b5563;line-height:1.6;">
Use the following One-Time Password (OTP) to securely sign in to your
<strong>Deli Cocktail House ERP</strong> account.
</p>

<!-- OTP -->

<div
style="margin:35px 0;background:#f8fafc;border:2px dashed #2563eb;border-radius:12px;padding:24px;text-align:center;">

<div
style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#2563eb;">

${otp}

</div>

<p style="margin-top:14px;color:#6b7280;font-size:14px;">
Valid for <strong>5 minutes</strong>
</p>

</div>

<div
style="background:#fff7ed;border-left:5px solid #f59e0b;padding:18px;border-radius:8px;">

<p style="margin:0;color:#92400e;font-size:15px;">
🔒 Never share this code with anyone. Deli Cocktail House will never ask
for your OTP via phone, WhatsApp, or email.
</p>

</div>

<p style="margin-top:30px;color:#6b7280;font-size:15px;line-height:1.7;">
If you didn't request this login, simply ignore this email. Your account
will remain secure.
</p>

</td>
</tr>

<!-- Footer -->

<tr>
<td
style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">

<p style="margin:0;font-size:15px;font-weight:600;color:#111827;">
Deli Cocktail House
</p>

<p style="margin-top:8px;color:#6b7280;font-size:13px;">
Inventory • Events • Warehouse • Staff • Attendance • Catering ERP
</p>

<p style="margin-top:18px;color:#9ca3af;font-size:12px;">
© ${new Date().getFullYear()} Deli Cocktail House. All Rights Reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
  });
}