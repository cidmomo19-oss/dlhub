import { escapeHtml } from "./_lib/util.js";
import { iconSvg } from "./_lib/icons.js";

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
    "SELECT id, title, description, servers, views FROM links WHERE id = ?"
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

function layout({ title, body, robotsIndex = false }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="${robotsIndex ? "index, follow" : "noindex, nofollow"}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body class="page-view">
${body}
</body>
</html>`;
}

function renderPage(row, servers) {
  const title = row.title?.trim() || "Paket unduhan";
  const description = row.description?.trim() || "";

  const items = servers
    .map(
      (s) => `
      <a class="lane" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer nofollow"
         style="--lane-accent:${escapeHtml(s.color)}">
        <span class="lane-badge">${iconSvg(s.icon, 20)}</span>
        <span class="lane-label">${escapeHtml(s.label)}</span>
        <span class="lane-arrow" aria-hidden="true">↗</span>
      </a>`
    )
    .join("");

  const body = `
  <main class="wrap">
    <div class="ticket">
      <header class="ticket-head">
        <div class="brand"><span class="brand-mark">⬡</span> DLHUB</div>
        <div class="tracking">PAKET&nbsp;#<span>${escapeHtml(row.id)}</span></div>
      </header>

      <div class="perforation" aria-hidden="true"></div>

      <div class="ticket-body">
        <h1 class="pkg-title">${escapeHtml(title)}</h1>
        ${description ? `<p class="pkg-desc">${escapeHtml(description)}</p>` : ""}

        <div class="lanes-label">
          <span>JALUR SERVER</span><span class="lanes-count">${servers.length} tersedia</span>
        </div>
        <div class="lanes">
          ${items}
        </div>

        <p class="hint">Pilih salah satu server di atas untuk mulai mengunduh. Kalau satu server error atau lambat, coba server lain di daftar.</p>
      </div>
    </div>
    <footer class="page-footer">Dibuat dengan DLHUB</footer>
  </main>`;

  return layout({ title: `${title} — Pilih Server Download`, body });
}

function renderNotFound(id) {
  const body = `
  <main class="wrap">
    <div class="ticket">
      <header class="ticket-head">
        <div class="brand"><span class="brand-mark">⬡</span> DLHUB</div>
        <div class="tracking">PAKET&nbsp;#<span>${escapeHtml(id)}</span></div>
      </header>
      <div class="perforation" aria-hidden="true"></div>
      <div class="ticket-body state-empty">
        <h1 class="pkg-title">Halaman nggak ketemu</h1>
        <p class="pkg-desc">Kode <strong>${escapeHtml(id)}</strong> nggak ada di database, salah ketik, atau memang belum pernah dibuat.</p>
        <a class="btn-back" href="/">← Buat halaman baru</a>
      </div>
    </div>
  </main>`;
  return layout({ title: "Halaman tidak ditemukan — DLHUB", body });
}

function renderError(message) {
  const body = `
  <main class="wrap">
    <div class="ticket">
      <div class="ticket-body state-empty">
        <h1 class="pkg-title">Terjadi kesalahan</h1>
        <p class="pkg-desc">${escapeHtml(message)}</p>
      </div>
    </div>
  </main>`;
  return layout({ title: "Error — DLHUB", body });
}
