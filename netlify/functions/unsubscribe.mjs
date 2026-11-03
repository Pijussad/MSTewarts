import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing unsubscribe token.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  const store = getStore('newsletter');
  const pointer = await store.get(`token:${token}`, { type: 'json' }).catch(() => null);

  if (!pointer?.email) {
    return new Response('Invalid unsubscribe link.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  const key = `sub:${pointer.email}`;
  const subscriber = await store.get(key, { type: 'json' }).catch(() => null);

  if (subscriber) {
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date().toISOString();
    await store.setJSON(key, subscriber);
  }

  const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 520px; margin: 80px auto; padding: 24px; color: #222;">
    <h2>You&rsquo;re unsubscribed</h2>
    <p>${pointer.email} will no longer receive new-post emails from MSTewart&rsquo;s Cozy Corner.</p>
    <p><a href="https://mstewarts3.fun/">Back to the blog</a></p>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
};
