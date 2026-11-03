import nodemailer from 'nodemailer';

export function getTransport() {
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 3,
    auth: { user, pass }
  });
}

export function unsubscribeUrl(site, token) {
  return `${site.replace(/\/$/, '')}/.netlify/functions/unsubscribe?token=${encodeURIComponent(token)}`;
}
