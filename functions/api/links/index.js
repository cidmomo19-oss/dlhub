import { jsonResponse, checkAdmin } from "../../_lib/util.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!checkAdmin(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const { results } = await env.DB.prepare(
      "SELECT id, title, thumbnail, created_at, last_checked_at, views FROM links ORDER BY last_checked_at ASC, created_at ASC LIMIT 100"
    ).all();

    return jsonResponse({ links: results || [] });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
