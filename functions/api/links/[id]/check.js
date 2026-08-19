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

  const now = Date.now();
  const result = await env.DB.prepare("UPDATE links SET last_checked_at = ? WHERE id = ?")
    .bind(now, params.id)
    .run();

  if (!result.meta || result.meta.changes === 0) {
    return jsonResponse({ error: "Link nggak ketemu." }, 404);
  }

  return jsonResponse({ id: params.id, last_checked_at: now });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
