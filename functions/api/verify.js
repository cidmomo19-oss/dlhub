import { jsonResponse } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) {
    return jsonResponse({ ok: false, error: "ADMIN_KEY belum di-set di server. Buka README." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const provided = (body && body.key) || "";
  if (provided !== env.ADMIN_KEY) {
    return jsonResponse({ ok: false, error: "Admin key salah." }, 401);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, pakai POST." }, 405);
}
