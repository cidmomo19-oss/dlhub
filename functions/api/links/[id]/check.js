import { jsonResponse, checkAdmin } from "../../../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (!checkAdmin(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!id) {
    return jsonResponse({ error: "ID tidak valid" }, 400);
  }

  try {
    // Gunakan milidetik (Date.now()) sesuai format frontend app.js
    const now = Date.now();
    const result = await env.DB.prepare(
      "UPDATE links SET last_checked_at = ? WHERE id = ?"
    ).bind(now, id).run();

    if (result.meta?.changes === 0) {
      return jsonResponse({ error: "Link tidak ditemukan" }, 404);
    }

    return jsonResponse({ ok: true, last_checked_at: now });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
