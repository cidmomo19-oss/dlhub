import { jsonResponse, checkAdmin } from "../../../_lib/util.js";

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

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai DELETE." }, 405);
}
