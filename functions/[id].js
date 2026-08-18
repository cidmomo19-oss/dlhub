function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const id = params.id;

  // Cek cache Cloudflare terlebih dahulu
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Query D1 Database
  let link = null;
  try {
    link = await env.DB.prepare(
      "SELECT * FROM links WHERE id = ?"
    ).bind(id).first();
  } catch (err) {
    return new Response("Database Error", { status: 500 });
  }

  // Jika ID tidak ditemukan
  if (!link) {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Link Tidak Ditemukan — DLHUB</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="wrap">
    <div class="ticket">
      <header class="ticket-head">
        <div class="brand"><span class="brand-mark">⬡</span> DLHUB</div>
        <div class="tracking">404 NOT FOUND</div>
      </header>
      <div class="ticket-body state-empty">
        <h1 class="pkg-title">Link Tidak Ditemukan</h1>
        <p class="pkg-desc">Halaman yang kamu cari mungkin sudah dihapus atau salah alamat URL.</p>
        <a href="/" class="btn-back">Buat Link Baru</a>
      </div>
    </div>
  </main>
</body>
</html>`;
    return new Response(notFoundHtml, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  // Update counter views (best effort, non-blocking)
  context.waitUntil(
    env.DB.prepare("UPDATE links SET views = views + 1 WHERE id = ?").bind(id).run()
  );

  let servers = [];
  try {
    servers = JSON.parse(link.servers || link.lanes || "[]");
  } catch (e) {
    servers = [];
  }

  const title = link.title || "File Download";
  const desc = link.description || "";

  // Render daftar server dengan icon download SVG
  const lanesHtml = servers.map(item => `
    <a href="${escapeHtml(item.url)}" class="lane" target="_blank" rel="noopener noreferrer">
      <span class="lane-label">${escapeHtml(item.label || item.name || 'Download Server')}</span>
      <span class="lane-arrow" title="Download">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </span>
    </a>
  `).join("");

  const pageHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)} — DLHUB</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="wrap">
    <div class="ticket">
      <header class="ticket-head">
        <div class="brand"><span class="brand-mark">⬡</span> DLHUB</div>
        <div class="tracking">ID: <span>${escapeHtml(id)}</span></div>
      </header>

      <div class="ticket-body">
        <h1 class="pkg-title">${escapeHtml(title)}</h1>
        ${desc ? `<p class="pkg-desc">${escapeHtml(desc)}</p>` : ''}

        <div class="lanes-label">
          <span>PILIH SERVER</span>
          <span class="lanes-count">${servers.length} SERVER</span>
        </div>

        <div class="lanes">
          ${lanesHtml}
        </div>
      </div>
    </div>
    <footer class="page-footer">Cloudflare Pages + D1</footer>
  </main>
</body>
</html>`;

  const response = new Response(pageHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });

  // Simpan ke Cache Cloudflare di edge
  context.waitUntil(cache.put(request, response.clone()));

  return response;
}
