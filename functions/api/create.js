import { generateId, jsonResponse, isSafeUrl, isHexColor } from "../_lib/util.js";
import { ICON_KEYS } from "../_lib/icons.js";

const MAX_SERVERS = 15;

export async function onRequestPost(context) {
  const { request, env } = context;

  // Proteksi sederhana biar endpoint create nggak disalahgunain orang lain
  // (hemat kuota D1 write & storage). Set env var ADMIN_KEY di Cloudflare
  // Pages kalau mau aktifin ini. Kalau kosong, endpoint terbuka untuk semua.
  if (env.ADMIN_KEY) {
    const provided = request.headers.get("x-admin-key") || "";
    if (provided !== env.ADMIN_KEY) {
      return jsonResponse({ error: "Admin key salah atau kosong." }, 401);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body request bukan JSON yang valid." }, 400);
  }

  const { title, description, servers } = body || {};

  if (!Array.isArray(servers) || servers.length === 0) {
    return jsonResponse({ error: "Minimal harus ada 1 server." }, 400);
  }
  if (servers.length > MAX_SERVERS) {
    return jsonResponse({ error: `Maksimal ${MAX_SERVERS} server per halaman.` }, 400);
  }

  const cleanServers = [];
  for (const s of servers) {
    if (!s || !isSafeUrl(s.url)) continue;
    cleanServers.push({
      label: String(s.label || "Download").trim().slice(0, 40) || "Download",
      url: new URL(s.url).toString(),
      color: isHexColor(s.color) ? s.color : "#ff8a1e",
      icon: ICON_KEYS.includes(s.icon) ? s.icon : "download",
    });
  }

  if (cleanServers.length === 0) {
    return jsonResponse({ error: "Nggak ada URL server yang valid (harus http/https)." }, 400);
  }

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  // Generate ID unik, coba ulang kalau kebetulan bentrok
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
    `INSERT INTO links (id, title, description, servers, created_at, views)
     VALUES (?, ?, ?, ?, ?, 0)`
  )
    .bind(
      id,
      String(title || "").trim().slice(0, 100),
      String(description || "").trim().slice(0, 300),
      JSON.stringify(cleanServers),
      Date.now()
    )
    .run();

  const origin = new URL(request.url).origin;
  return jsonResponse({ id, url: `${origin}/${id}` }, 201);
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
