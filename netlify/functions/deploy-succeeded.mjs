import { getStore } from '@netlify/blobs';
import { getTransport, unsubscribeUrl } from './_lib/mailer.mjs';

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

export default async () => {
  const store = getStore('newsletter');

  let latest;
  try {
    latest = await getLatest();
  } catch (err) {
    console.error('newsletter: feed error', err.message);
    return;
  }
  if (!latest?.id) return;

  const meta = await store.get('meta:last_sent', { type: 'json' }).catch(() => null);

  // First run: remember the current post but do not blast the backlog.
  if (!meta?.id) {
    await store.setJSON('meta:last_sent', {
      id: latest.id,
      at: new Date().toISOString(),
      bootstrapped: true
    });
    console.log('newsletter: bootstrapped at', latest.id);
    return;
  }

  if (meta.id === latest.id) return;

  const list = await store.list({ prefix: 'sub:' });
  const subscribers = [];
  for (const blob of list.blobs || []) {
    const sub = await store.get(blob.key, { type: 'json' }).catch(() => null);
    if (sub?.status === 'active') subscribers.push(sub);
  }

  if (!subscribers.length) {
    await store.setJSON('meta:last_sent', {
      id: latest.id,
      at: new Date().toISOString(),
      sent: 0
    });
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.warn('newsletter: SMTP not configured; will retry on next deploy');
    return;
  }

  const from = process.env.NEWSLETTER_FROM || process.env.ZOHO_SMTP_USER;
  let sent = 0;

  for (const sub of subscribers) {
    const unsub = unsubscribeUrl(SITE, sub.token);
    const subject = `New story: ${latest.title}`;
    const text = `${latest.title}\n\n${latest.summary}\n\nRead it: ${latest.url}\n\nUnsubscribe: ${unsub}`;
    const html = `<p><strong>${escapeHtml(latest.title)}</strong></p>
<p>${escapeHtml(latest.summary)}</p>
<p><a href="${escapeHtml(latest.url)}">Read the full story</a></p>
<hr>
<p style="font-size:12px;color:#666"><a href="${escapeHtml(unsub)}">Unsubscribe</a></p>`;

    try {
      await transport.sendMail({
        from: `"MSTewart's Cozy Corner" <${from}>`,
        to: sub.email,
        subject,
        text,
        html
      });
      sent++;
    } catch (err) {
      console.error('newsletter: send failed', sub.email, err.message);
    }
  }

  if (sent > 0) {
    await store.setJSON('meta:last_sent', {
      id: latest.id,
      at: new Date().toISOString(),
      sent
    });
    console.log(`newsletter: sent ${sent} of ${subscribers.length}`);
  } else {
    console.warn('newsletter: no emails sent; will retry on next deploy');
  }
};
