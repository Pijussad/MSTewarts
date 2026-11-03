import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { getTransport } from './_lib/mailer.mjs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SITE = process.env.NEWSLETTER_SITE_URL || 'https://mstewarts3.fun';

function decode(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getLatest() {
  const res = await fetch(`${SITE}/feed.xml?ts=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' }
  });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const xml = await res.text();
  const match = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!match) return null;
  const entry = match[1];
  const get = (re) => {
    const m = entry.match(re);
    return m ? m[1].trim() : '';
  };
  return {
    id: get(/<id>(.*?)<\/id>/),
    title: decode(get(/<title[^>]*>(.*?)<\/title>/)),
    summary: decode(get(/<summary[^>]*>(.*?)<\/summary>/) || get(/<content[^>]*>(.*?)<\/content>/)),
    url: get(/<link[^>]*href="([^"]+)"/)
  };
}

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
    const meta = await store.get('meta:last_sent', { type: 'json' }).catch(() => null);
    return Response.json({ count: subscribers.length, subscribers, meta });
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

    if (body.action === 'arm') {
      await store.setJSON('meta:last_sent', {
        id: `manual-${Date.now()}`,
        at: new Date().toISOString(),
        armed: true
      });
      return Response.json({ ok: true });
    }

    if (body.action === 'send-latest') {
      const transport = getTransport();
      if (!transport) {
        return Response.json({ ok: false, error: 'smtp_not_configured' }, { status: 400 });
      }
      const latest = await getLatest();
      if (!latest?.id) {
        return Response.json({ ok: false, error: 'feed_empty' }, { status: 400 });
      }
      const list = await store.list({ prefix: 'sub:' });
      const subscribers = [];
      for (const blob of list.blobs || []) {
        const sub = await store.get(blob.key, { type: 'json' }).catch(() => null);
        if (sub?.status === 'active') subscribers.push(sub);
      }
      if (!subscribers.length) {
        return Response.json({ ok: true, id: latest.id, sent: 0, total: 0, failed: [] });
      }
      const from = process.env.NEWSLETTER_FROM || process.env.ZOHO_SMTP_USER;
      const subject = `New story: ${latest.title}`;
      const results = await Promise.allSettled(subscribers.map(async (sub) => {
        const unsub = `${SITE.replace(/\/$/, '')}/.netlify/functions/unsubscribe?token=${encodeURIComponent(sub.token)}`;
        const text = `${latest.title}\n\n${latest.summary}\n\nRead it: ${latest.url}\n\nUnsubscribe: ${unsub}`;
        const html = `<p><strong>${escapeHtml(latest.title)}</strong></p>
<p>${escapeHtml(latest.summary)}</p>
<p><a href="${escapeHtml(latest.url)}">Read the full story</a></p>
<hr>
<p style="font-size:12px;color:#666"><a href="${escapeHtml(unsub)}">Unsubscribe</a></p>`;
        await transport.sendMail({
          from: `"MSTewart's Cozy Corner" <${from}>`,
          to: sub.email,
          subject,
          text,
          html
        });
        return sub.email;
      }));
      const sent = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results
        .map((r, i) => (r.status === 'rejected' ? subscribers[i].email : null))
        .filter(Boolean);
      await store.setJSON('meta:last_sent', {
        id: latest.id,
        at: new Date().toISOString(),
        sent
      });
      return Response.json({ ok: true, id: latest.id, sent, total: subscribers.length, failed });
    }

    return Response.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  }

  return new Response('Method not allowed', { status: 405 });
};
