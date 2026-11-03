import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { getTransport } from './_lib/mailer.mjs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function forbidden() {
  return new Response('Forbidden', { status: 403 });
}

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!process.env.NEWSLETTER_ADMIN_KEY || key !== process.env.NEWSLETTER_ADMIN_KEY) {
    return forbidden();
  }

  const store = getStore('newsletter');

  if (req.method === 'GET') {
    const list = await store.list({ prefix: 'sub:' });
    const subscribers = [];
    for (const blob of list.blobs || []) {
      const sub = await store.get(blob.key, { type: 'json' }).catch(() => null);
      if (sub) {
        subscribers.push({
          email: sub.email,
          status: sub.status,
          subscribedAt: sub.subscribedAt,
          unsubscribedAt: sub.unsubscribedAt || null
        });
      }
    }
    return Response.json({ count: subscribers.length, subscribers });
  }

  if (req.method === 'POST') {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 });
    }

    if (body.action === 'import' && Array.isArray(body.emails)) {
      let added = 0;
      for (const raw of body.emails) {
        const email = String(raw || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) continue;
        const key = `sub:${email}`;
        const existing = await store.get(key, { type: 'json' }).catch(() => null);
        if (existing?.status === 'active') continue;
        const token = existing?.token || crypto.randomUUID();
        await store.setJSON(key, {
          email,
          status: 'active',
          subscribedAt: new Date().toISOString(),
          token,
          imported: true
        });
        await store.setJSON(`token:${token}`, { email });
        added++;
      }
      return Response.json({ ok: true, added });
    }

    if (body.action === 'remove' && Array.isArray(body.emails)) {
      let removed = 0;
      for (const raw of body.emails) {
        const email = String(raw || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) continue;
        const subKey = `sub:${email}`;
        const existing = await store.get(subKey, { type: 'json' }).catch(() => null);
        if (existing?.token) await store.delete(`token:${existing.token}`);
        await store.delete(subKey);
        removed++;
      }
      return Response.json({ ok: true, removed });
    }

    if (body.action === 'test' && body.email) {
      const transport = getTransport();
      if (!transport) {
        return Response.json({ ok: false, error: 'smtp_not_configured' }, { status: 400 });
      }
      const from = process.env.NEWSLETTER_FROM || process.env.ZOHO_SMTP_USER;
      await transport.sendMail({
        from: `"MSTewart's Cozy Corner" <${from}>`,
        to: body.email,
        subject: 'Newsletter test',
        text: 'SMTP is working. New posts will be emailed automatically.',
        html: '<p>SMTP is working. New posts will be emailed automatically.</p>'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  }

  return new Response('Method not allowed', { status: 405 });
};
