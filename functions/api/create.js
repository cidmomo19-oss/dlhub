import { generateId, jsonResponse, isSafeUrl, isHexColor, checkAdmin } from "../_lib/util.js";

const MAX_SERVERS = 15;

export async function onRequestPost(context) {
  const { request, env } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body request bukan JSON yang valid." }, 400);
  }

  const { title, description, thumbnail, servers } = body || {};

  if (!Array.isArray(servers) || servers.length === 0) {
    return jsonResponse({ error: "Minimal harus ada 1 server." }, 400);
  }
  if (servers.length > MAX_SERVERS) {
    return jsonResponse({ error: `Maksimal ${MAX_SERVERS} server per halaman.` }, 400);
  }

  const now = Date.now();
  const cleanServers = [];
  for (const s of servers) {
    if (!s || !isSafeUrl(s.url)) continue;
    const expiryDaysInput = parseInt(s.expiry_days, 10);
    const expiryDays = !isNaN(expiryDaysInput) && expiryDaysInput > 0 ? expiryDaysInput : 30;

    cleanServers.push({
      label: String(s.label || "Download").trim().slice(0, 40) || "Download",
      url: new URL(s.url).toString(),
      color: isHexColor(s.color) ? s.color : "#ff8a1e",
      expiry_days: expiryDays,
      last_clicked_at: now,
    });
  }

  if (cleanServers.length === 0) {
    return jsonResponse({ error: "Nggak ada URL server yang valid (harus http/https)." }, 400);
  }

  const thumbnailValue = String(thumbnail || "").trim();
  if (thumbnailValue && !isSafeUrl(thumbnailValue)) {
    return jsonResponse({ error: "URL thumbnail nggak valid (harus http/https)." }, 400);
  }
  const cleanThumbnail = thumbnailValue ? new URL(thumbnailValue).toString() : "";

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  let id = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateId(7);
    const existing = await env.DB.prepare("SELECT id FROM links WHERE id = ?").bind(candidate).first();
    if (!existing) {
      id = candidate;
      break;
    }
  }
  if (!id) return jsonResponse({ error: "Gagal generate ID unik, coba lagi." }, 500);

  await env.DB.prepare(
    `INSERT INTO links (id, title, description, thumbnail, servers, created_at, last_checked_at, expiry_days, views)
     VALUES (?, ?, ?, ?, ?, ?, ?, 30, 0)`
  )
    .bind(
      id,
      String(title || "").trim().slice(0, 100),
      String(description || "").trim().slice(0, 300),
      cleanThumbnail,
      JSON.stringify(cleanServers),
      now,
      now
    )
    .run();

  const origin = new URL(request.url).origin;
  return jsonResponse({ id, url: `${origin}/${id}` }, 201);
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
