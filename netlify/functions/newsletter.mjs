import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  }

  let email = '';
  try {
    const body = await req.json();
    email = String(body.email || '').trim().toLowerCase();
  } catch {
    return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const store = getStore('newsletter');
  const key = `sub:${email}`;
  const existing = await store.get(key, { type: 'json' }).catch(() => null);

  if (!existing || existing.status !== 'active') {
    const token = existing?.token || crypto.randomUUID();
    await store.setJSON(key, {
      email,
      status: 'active',
      subscribedAt: new Date().toISOString(),
      token
    });
    await store.setJSON(`token:${token}`, { email });
  }

  return Response.json({ ok: true });
};
