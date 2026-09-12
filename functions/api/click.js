import { jsonResponse } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({ error: "D1 database not bound." }, 500);
  }

  let id = null;
  try {
    const text = await request.text();
    const data = JSON.parse(text);
    id = data.id;
  } catch {
    id = null;
  }

  if (!id || typeof id !== "string") {
    return jsonResponse({ error: "ID tidak valid." }, 400);
  }

  const now = Date.now();
  const result = await env.DB.prepare("UPDATE links SET last_checked_at = ? WHERE id = ?")
    .bind(now, id)
    .run();

  if (!result.meta || result.meta.changes === 0) {
    return jsonResponse({ error: "Link tidak ditemukan." }, 404);
  }

  return jsonResponse({ ok: true, id, last_checked_at: now });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
