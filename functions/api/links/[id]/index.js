import { jsonResponse, checkAdmin, isSafeUrl, isHexColor } from "../../../_lib/util.js";

const MAX_SERVERS = 15;

export async function onRequestGet(context) {
  const { request, env, params } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  const row = await env.DB.prepare(
    "SELECT id, title, description, thumbnail, servers, created_at, last_checked_at, views FROM links WHERE id = ?"
  )
    .bind(params.id)
    .first();

  if (!row) {
    return jsonResponse({ error: "Link nggak ketemu." }, 404);
  }

  let servers = [];
  try {
    servers = JSON.parse(row.servers);
  } catch {
    servers = [];
  }

  return jsonResponse({
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    thumbnail: row.thumbnail || "",
    servers,
    created_at: row.created_at,
    last_checked_at: row.last_checked_at,
    views: row.views,
  });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  const existing = await env.DB.prepare("SELECT id FROM links WHERE id = ?").bind(params.id).first();
  if (!existing) {
    return jsonResponse({ error: "Link nggak ketemu." }, 404);
  }

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

  const cleanServers = [];
  for (const s of servers) {
    if (!s || !isSafeUrl(s.url)) continue;
    cleanServers.push({
      label: String(s.label || "Download").trim().slice(0, 40) || "Download",
      url: new URL(s.url).toString(),
      color: isHexColor(s.color) ? s.color : "#ff8a1e",
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

  const cleanTitle = String(title || "").trim().slice(0, 100);
  const cleanDescription = String(description || "").trim().slice(0, 300);

  await env.DB.prepare(
    `UPDATE links
     SET title = ?, description = ?, thumbnail = ?, servers = ?
     WHERE id = ?`
  )
    .bind(cleanTitle, cleanDescription, cleanThumbnail, JSON.stringify(cleanServers), params.id)
    .run();

  return jsonResponse({
    id: params.id,
    title: cleanTitle,
    description: cleanDescription,
    thumbnail: cleanThumbnail,
    servers: cleanServers,
  });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  const result = await env.DB.prepare("DELETE FROM links WHERE id = ?").bind(params.id).run();

  if (!result.meta || result.meta.changes === 0) {
    return jsonResponse({ error: "Link nggak ketemu." }, 404);
  }

  return jsonResponse({ id: params.id, deleted: true });
}
