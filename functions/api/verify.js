import { jsonResponse } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  // If ADMIN_KEY is set in environment, verify against provided key
  if (env.ADMIN_KEY) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { key } = body || {};
    if (key !== env.ADMIN_KEY) {
      return jsonResponse({ error: "Admin key salah." }, 401);
    }
  }

  return jsonResponse({ success: true, message: "Admin key valid." }, 200);
}

export async function onRequestGet() {
  return jsonResponse({ error: "Method not allowed, gunakan POST." }, 405);
}
