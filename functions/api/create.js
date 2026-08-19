import { jsonResponse, checkAdmin, generateId } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Validasi admin key (header atau body)
  if (!checkAdmin(request, env, body)) {
    return jsonResponse({ error: "Unauthorized / Admin key salah" }, 401);
  }

  try {
    const { title = "", thumbnail = "", description = "", servers = [] } = body;

    if (!Array.isArray(servers) || servers.length === 0) {
      return jsonResponse({ error: "Minimal harus ada 1 server download." }, 400);
    }

    if (servers.length > 15) {
      return jsonResponse({ error: "Maksimal 15 server download." }, 400);
    }

    for (const s of servers) {
      if (!s.url || !/^https?:\/\//i.test(s.url)) {
        return jsonResponse({ error: "Semua server harus memiliki URL http/https yang valid." }, 400);
      }
    }

    const id = generateId(7);
    const now = Math.floor(Date.now() / 1000);
    const serversJson = JSON.stringify(servers);

    await env.DB.prepare(
      `INSERT INTO links (id, title, thumbnail, description, servers, created_at, last_checked_at, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      id,
      title.trim(),
      thumbnail.trim(),
      description.trim(),
      serversJson,
      now,
      now
    ).run();

    const host = request.headers.get("host") || "";
    const protocol = request.url.startsWith("https") ? "https" : "http";
    const fullUrl = `${protocol}://${host}/${id}`;

    return jsonResponse({ ok: true, id, url: fullUrl });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
