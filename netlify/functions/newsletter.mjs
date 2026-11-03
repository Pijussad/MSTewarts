const FOLLOWIT_URL = 'https://api.follow.it/subscription-form/L0IvVUp5YldaUDQybSt4NU83STZPNkh4Uzg1Qm12RmxOQkczbEY1V0pmMEFEaG9BOFpFZFFlS2RVVUc1bkNsVUlGa3E0Z3d1SUw4bER5WG1xKzNwOTBpUHFMd1VnVm9hcGkxMVhwd2NSeVhpUlZOY2ltMHo3ZVcxUmhvdTRmczF8ZHB3V3JNTko1RjFGMTAvMm8wZCsyU05hQVBrUlRYa0h3ZXdTZHprTDZ3Zz0=/8';

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  }

  let email = '';
  try {
    const body = await req.json();
    email = String(body.email || '').trim();
  } catch {
    return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  try {
    const res = await fetch(FOLLOWIT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email }).toString(),
      redirect: 'manual'
    });
    return Response.json({ ok: res.status >= 200 && res.status < 400 });
  } catch {
    return Response.json({ ok: false, error: 'upstream_error' }, { status: 502 });
  }
};
