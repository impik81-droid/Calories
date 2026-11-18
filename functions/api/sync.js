// Cloudflare Pages Function: POST /api/sync
// Общий каталог продуктов (таблица products) + личные данные по e-mail (таблица users).
// E-mail приходит от Cloudflare Access в заголовке Cf-Access-Authenticated-User-Email.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost({ request, env }) {
  const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  if (!email) return json({ error: 'auth' }, 401);
  if (!env.DB) return json({ error: 'D1 binding DB is missing' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  // --- общий каталог: слияние по id, побеждает больший u (время изменения) ---
  const upsert = env.DB.prepare(
    `INSERT INTO products (id, data, u, deleted) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, u = excluded.u, deleted = excluded.deleted
     WHERE excluded.u > products.u`
  );
  const stmts = [];
  const products = Array.isArray(body.products) ? body.products.slice(0, 3000) : [];
  for (const p of products) {
    if (!p || typeof p.id !== 'string' || p.id.length > 80) continue;
    const { u, ...rest } = p;
    stmts.push(upsert.bind(p.id, JSON.stringify(rest), Number(u) || 0, 0));
  }
  const tomb = Array.isArray(body.tomb) ? body.tomb.slice(0, 3000) : [];
  for (const t of tomb) {
    if (!t || typeof t.id !== 'string' || t.id.length > 80) continue;
    stmts.push(upsert.bind(t.id, '{}', Number(t.u) || Date.now(), 1));
  }
  for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));

  // --- личные данные пользователя: побеждает более новая версия ---
  const row = await env.DB.prepare('SELECT data, u FROM users WHERE email = ?1').bind(email).first();
  let user = null, userU = 0;
  if (row) { try { user = JSON.parse(row.data); } catch { user = null; } userU = row.u; }

  const inU = Number(body.userU) || 0;
  if (body.user && typeof body.user === 'object' && (!row || inU > userU)) {
    const str = JSON.stringify(body.user);
    if (str.length > 1_800_000) return json({ error: 'user data too large' }, 413);
    await env.DB.prepare(
      `INSERT INTO users (email, data, u) VALUES (?1, ?2, ?3)
       ON CONFLICT(email) DO UPDATE SET data = excluded.data, u = excluded.u`
    ).bind(email, str, inU).run();
    user = body.user; userU = inU;
  }

  const { results } = await env.DB.prepare('SELECT id, data, u, deleted FROM products').all();
  return json({ email, products: results, user, userU });
}
