import { jsonResponse, checkAdmin } from "../_lib/util.js";

const LIST_LIMIT = 200;

export async function onRequestGet(context) {
  const { request, env } = context;

  const authError = checkAdmin(request, env);
  if (authError) return authError;

  if (!env.DB) {
    return jsonResponse(
      { error: "D1 belum ke-bind. Set binding 'DB' di Cloudflare Pages -> Settings -> Functions." },
      500
    );
  }

  // Urut dari yang paling lama nggak dicek -> paling mendesak duluan.
  const { results } = await env.DB.prepare(
    `SELECT id, title, created_at, last_checked_at, views FROM links
     ORDER BY last_checked_at ASC LIMIT ?`
  )
    .bind(LIST_LIMIT)
    .all();

  return jsonResponse({ links: results || [] });
}

export async function onRequestPost() {
  return jsonResponse({ error: "Method not allowed, pakai GET." }, 405);
}
