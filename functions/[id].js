import { escapeHtml } from "./_lib/util.js";
import { getMessages } from "./_lib/i18n.js";

// Helper agar nama server (Gofile, Pixeldrain, dll) selalu muncul tepat
function resolveServerName(s) {
  if (typeof s === "string") return s;
  
  const label = (s.label || s.name || s.custom || s.host || "").trim();
  if (label && label.toLowerCase() !== "download") {
    return label;
  }

  // Jika label kosong, deteksi otomatis dari domain URL
  if (s.url) {
    try {
      const host = new URL(s.url).hostname.toLowerCase().replace(/^www\./, "");
      if (host.includes("gofile")) return "Gofile";
      if (host.includes("pixeldrain")) return "Pixeldrain";
      if (host.includes("mega.nz") || host.includes("mega.io")) return "Mega";
      if (host.includes("terabox") || host.includes("1024tera")) return "TeraBox";
      if (host.includes("mediafire")) return "MediaFire";
      if (host.includes("drive.google")) return "Google Drive";
      if (host.includes("krakenfiles")) return "KrakenFiles";
      if (host.includes("1fichier")) return "1Fichier";
      if (host.includes("qiwi")) return "Qiwi";
      if (host.includes("buzzheavier")) return "Buzzheavier";
      if (host.includes("workupload")) return "Workupload";
      if (host.includes("sfile")) return "Sfile";
      
      const domainParts = host.split(".");
      if (domainParts.length > 1) {
        const name = domainParts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    } catch (e) {}
  }

  return "Download";
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

  // 1. Lewatkan rute statis & manage
  if (!id || id === "manage" || id === "favicon.ico" || id === "favicon.svg" || id === "robots.txt" || id === "style.css" || id === "app.js") {
    return context.next();
  }

  // 2. Cache API Cloudflare (dibedakan per bahasa ID/EN sesuai README)
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

  // 3. Ambil data dari database
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

  // Counter view (best-effort)
  if (context.waitUntil) {
    context.waitUntil(
      env.DB.prepare("UPDATE links SET views = views + 1 WHERE id = ?").bind(id).run().catch(() => {})
    );
  }

  // 4. Parse servers
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
<html lang="${t.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${t.notFoundTitle}</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
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
  const pageTitle = link.title ? escapeHtml(link.title) : t.defaultTitle;
  const titleHtml = `<h1 class="title">${pageTitle}</h1>`;
  const descHtml = link.description ? `<p class="desc">${escapeHtml(link.description)}</p>` : "";
  const thumbHtml = link.thumbnail ? `
    <div class="thumbnail">
      <img src="${escapeHtml(link.thumbnail)}" alt="${pageTitle}" loading="lazy">
    </div>
  ` : "";

  const serverButtons = servers.map(s => {
    const name = resolveServerName(s);
    return `
      <a href="${escapeHtml(s.url)}" class="server-btn" target="_blank" rel="noopener noreferrer nofollow">
        <span class="server-btn-label">${escapeHtml(name)}</span>
        <span class="server-btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </span>
      </a>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${pageTitle}</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="page">
    <div class="card">
      ${thumbHtml}
      <div class="card-body">
        ${titleHtml}
        ${descHtml}
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
