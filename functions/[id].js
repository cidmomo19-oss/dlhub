import { escapeHtml } from "./_lib/util.js";
import { getMessages } from "./_lib/i18n.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

  // Lewatkan jika halaman manage atau file aset statis
  if (!id || id === "manage" || id === "favicon.ico" || id === "robots.txt" || id === "style.css" || id === "app.js") {
    return context.next();
  }

  // Cek cache edge Cloudflare
  const country = request.cf?.country || "US";
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("lang", country === "ID" ? "id" : "en");
  
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  if (!env.DB) {
    return new Response("Database D1 belum di-binding.", { status: 500 });
  }

  const link = await env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(id).first();

  if (!link) {
    const staticFallback = await context.next();
    if (staticFallback.status !== 404) {
      return staticFallback;
    }
    const t = getMessages(country);
    return new Response(renderNotFound(t), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  // Counter view best-effort
  if (context.waitUntil) {
    context.waitUntil(
      env.DB.prepare("UPDATE links SET views = views + 1 WHERE id = ?").bind(id).run().catch(() => {})
    );
  }

  let servers = [];
  try {
    servers = typeof link.servers === "string" ? JSON.parse(link.servers) : (link.servers || []);
  } catch (e) {
    servers = [];
  }

  const t = getMessages(country);
  const html = renderDownloadPage(link, servers, t);

  const response = new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });

  if (context.waitUntil) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

function renderNotFound(t) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.notFoundTitle}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="page">
    <div class="card">
      <div class="card-body empty-state">
        <h1 class="title">${t.notFoundTitle}</h1>
        <p class="desc">${t.notFoundDesc}</p>
        <a href="/" class="back-link">${t.backHome}</a>
      </div>
    </div>
  </main>
</body>
</html>`;
}

function renderDownloadPage(link, servers, t) {
  const title = link.title ? escapeHtml(link.title) : t.title;
  const desc = link.description ? `<p class="desc">${escapeHtml(link.description)}</p>` : "";
  const thumbnail = link.thumbnail ? `
    <div class="thumbnail">
      <img src="${escapeHtml(link.thumbnail)}" alt="${title}" loading="lazy">
    </div>
  ` : "";

  // Ambil nama server dari s.label atau s.name
  const serverButtons = servers.map(s => {
    const serverName = s.label || s.name || s.host || "Download";
    return `
      <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer nofollow" class="server-btn">
        <span class="server-btn-label">${escapeHtml(serverName)}</span>
        <span class="server-btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </span>
      </a>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${title}</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="page">
    <div class="card">
      ${thumbnail}
      <div class="card-body">
        <h1 class="title">${title}</h1>
        ${desc}
        <div class="servers-label">${t.serversLabel}</div>
        <div class="server-list">
          ${serverButtons}
        </div>
        <p class="hint">${t.hint}</p>
      </div>
    </div>
  </main>
</body>
</html>`;
}
