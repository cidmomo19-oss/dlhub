import { escapeHtml } from "./_lib/util.js";
import { getMessages } from "./_lib/i18n.js";

// Fungsi pintar untuk mendeteksi nama server otomatis dari link URL
function getHostNameFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    
    if (hostname.includes("gofile")) return "Gofile";
    if (hostname.includes("pixeldrain")) return "Pixeldrain";
    if (hostname.includes("mega.nz") || hostname.includes("mega.io")) return "Mega";
    if (hostname.includes("terabox") || hostname.includes("1024tera") || hostname.includes("4funbox")) return "TeraBox";
    if (hostname.includes("mediafire")) return "MediaFire";
    if (hostname.includes("drive.google")) return "Google Drive";
    if (hostname.includes("krakenfiles")) return "KrakenFiles";
    if (hostname.includes("1fichier")) return "1Fichier";
    if (hostname.includes("qiwi")) return "Qiwi";
    if (hostname.includes("buzzheavier")) return "Buzzheavier";
    if (hostname.includes("workupload")) return "Workupload";
    if (hostname.includes("dropbox")) return "Dropbox";
    if (hostname.includes("onedrive")) return "OneDrive";
    if (hostname.includes("send.cm")) return "Send.cm";
    if (hostname.includes("katfile")) return "KatFile";
    if (hostname.includes("rapidgator")) return "Rapidgator";
    if (hostname.includes("ddownload")) return "DDownload";
    if (hostname.includes("datanodes")) return "DataNodes";
    if (hostname.includes("sfile")) return "Sfile";
    
    // Fallback: Ambil nama domain utama dan jadikan huruf kapital di awal
    const parts = hostname.split(".");
    if (parts.length > 1) {
      const name = parts[parts.length - 2];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return hostname;
  } catch (e) {
    return "Server";
  }
}

// Menentukan label tombol yang tepat
function resolveServerLabel(s) {
  if (typeof s === "string") {
    return getHostNameFromUrl(s);
  }

  const custom = (s.custom || s.customLabel || s.custom_label || s.note || s.part || "").trim();
  const label = (s.label || s.name || s.title || s.hostLabel || s.serverName || s.text || "").trim();
  const host = (s.host || s.server || s.service || s.preset || s.value || "").trim();

  // Jika ada nama preset + catatan custom (misal: "Gofile" dan "Part 1")
  if (custom && label && custom.toLowerCase() !== label.toLowerCase() && label.toLowerCase() !== "download") {
    return `${label} (${custom})`;
  }
  if (custom) return custom;
  if (label && label.toLowerCase() !== "download") return label;
  
  if (host && host.toLowerCase() !== "download" && host.toLowerCase() !== "custom") {
    return host.charAt(0).toUpperCase() + host.slice(1);
  }

  // Jika semua kosong, otomatis ambil dari domain URL-nya (Gofile, Pixeldrain, dll.)
  if (s.url) {
    return getHostNameFromUrl(s.url);
  }

  return "Download";
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

  // 1. Lewatkan rute statis & halaman manage
  if (!id || id === "manage" || id === "favicon.ico" || id === "favicon.svg" || id === "robots.txt" || id === "style.css" || id === "app.js") {
    return context.next();
  }

  // 2. Query database D1
  if (!env.DB) {
    return new Response("Database D1 belum di-binding.", { status: 500 });
  }

  const link = await env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(id).first();

  if (!link) {
    const staticFallback = await context.next();
    if (staticFallback.status !== 404) {
      return staticFallback;
    }
    const country = request.cf?.country || "US";
    const t = getMessages(country);
    return new Response(renderNotFound(t), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  // Counter view
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

  const country = request.cf?.country || "US";
  const t = getMessages(country);
  const html = renderDownloadPage(link, servers, t);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache" // no-cache agar perubahan nama server langsung tampil tanpa tersangkut cache lama
    }
  });
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

  // Render tombol dengan label nama server yang sudah diperbaiki
  const serverButtons = servers.map(s => {
    const serverName = resolveServerLabel(s);
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
