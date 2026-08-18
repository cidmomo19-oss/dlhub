import { escapeHtml } from "./_lib/util.js";

// File statis (style.css, app.js, favicon.svg, dst) sudah otomatis dilayani
// langsung dari /public oleh Cloudflare Pages, jadi request itu nggak pernah
// nyampe ke Function ini — nggak makan kuota.

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const cache = caches.default;

  // 1) Cek cache edge dulu. Kalau HIT, langsung balikin — nol query ke D1.
  const cached = await cache.match(request);
  if (cached) return cached;

  const id = params.id;
  let response;

  if (!env.DB) {
    response = htmlResponse(renderError("D1 belum ke-bind ke project ini."), 500, "public, max-age=10");
    return response;
  }

  const row = await env.DB.prepare(
    "SELECT id, title, description, thumbnail, servers, views FROM links WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) {
    // Cache pendek buat 404, biar ID ngasal/nyasar nggak terus-terusan hit D1
    response = htmlResponse(renderNotFound(id), 404, "public, max-age=120");
  } else {
    let servers = [];
    try {
      servers = JSON.parse(row.servers);
    } catch {
      servers = [];
    }

    response = htmlResponse(
      renderPage(row, servers),
      200,
      // Halaman dianggap tetap/immutable begitu dibuat -> cache lama & agresif.
      // Kalau nanti nambah fitur edit, purge cache URL-nya lewat dashboard
      // Cloudflare (Caching -> Configuration -> Purge by URL).
      "public, max-age=31536000, s-maxage=31536000, immutable"
    );

    // Best-effort view counter. Ini CUMA jalan pas cache MISS, jadi setelah
    // halaman "dingin" di edge cache, angka views nggak lagi nambah persis
    // per-visit. Trade-off sadar demi hemat kuota D1 write.
    context.waitUntil(
      env.DB.prepare("UPDATE links SET views = views + 1 WHERE id = ?").bind(id).run()
    );
  }

  context.waitUntil(cache.put(request, response.clone()));
  return response;
}

function htmlResponse(html, status, cacheControl) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": cacheControl,
    },
  });
}

function layout({ title, body }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${body}
</body>
</html>`;
}

function renderPage(row, servers) {
  const title = row.title?.trim() || "Paket unduhan";
  const description = row.description?.trim() || "";
  const thumbnail = row.thumbnail?.trim() || "";

  const downloadIcon =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></svg>';

  const items = servers
    .map(
      (s) => `
      <a class="server-btn" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer nofollow">
        <span class="server-btn-label">${escapeHtml(s.label)}</span>
        <span class="server-btn-icon" aria-hidden="true">${downloadIcon}</span>
      </a>`
    )
    .join("");

  const thumbnailHtml = thumbnail
    ? `<div class="thumbnail"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"></div>`
    : "";

  const body = `
  <main class="page">
    <div class="card">
      ${thumbnailHtml}
      <div class="card-body">
        <h1 class="title">${escapeHtml(title)}</h1>
        ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ""}

        <p class="servers-label">Server download (${servers.length})</p>
        <div class="server-list">
          ${items}
        </div>

        <p class="hint">Pilih salah satu server di atas untuk mulai mengunduh. Kalau satu server error atau lambat, coba server lain di daftar.</p>
      </div>
    </div>
  </main>`;

  return layout({ title: `${title} — Pilih Server Download`, body });
}

function renderNotFound(id) {
  const body = `
  <main class="page">
    <div class="card">
      <div class="card-body empty-state">
        <h1 class="title">Halaman nggak ketemu</h1>
        <p class="desc">Kode <strong>${escapeHtml(id)}</strong> nggak ada di database, salah ketik, atau memang belum pernah dibuat.</p>
        <a class="back-link" href="/">← Buat halaman baru</a>
      </div>
    </div>
  </main>`;
  return layout({ title: "Halaman tidak ditemukan — DLHUB", body });
}

function renderError(message) {
  const body = `
  <main class="page">
    <div class="card">
      <div class="card-body empty-state">
        <h1 class="title">Terjadi kesalahan</h1>
        <p class="desc">${escapeHtml(message)}</p>
      </div>
    </div>
  </main>`;
  return layout({ title: "Error — DLHUB", body });
}
