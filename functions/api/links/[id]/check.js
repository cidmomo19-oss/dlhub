import { jsonResponse, checkAdmin } from "../../../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  const row = await env.DB.prepare("SELECT servers FROM links WHERE id = ?").bind(params.id).first();
  if (!row) {
    return jsonResponse({ error: "Link nggak ketemu." }, 404);
  }

  let servers = [];
  try {
    servers = typeof row.servers === "string" ? JSON.parse(row.servers) : [];
  } catch {
    servers = [];
  }

  const now = Date.now();
  servers = servers.map((s) => ({ ...s, last_clicked_at: now }));

  await env.DB.prepare("UPDATE links SET last_checked_at = ?, servers = ? WHERE id = ?")
    .bind(now, JSON.stringify(servers), params.id)
    .run();

  return jsonResponse({ id: params.id, last_checked_at: now, servers });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
