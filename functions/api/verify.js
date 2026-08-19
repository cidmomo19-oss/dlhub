import { jsonResponse } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const serverKey = env.ADMIN_KEY;

  // 1. Cek apakah ADMIN_KEY sudah ada di Cloudflare Dashboard
  if (!serverKey || typeof serverKey !== "string" || serverKey.trim() === "") {
    return jsonResponse({
      error: "ADMIN_KEY belum diset di Cloudflare Pages (Settings > Environment variables) atau belum di-Redeploy."
    }, 500);
  }

  let clientKey = "";

  // 2. Cek key dari Header (Authorization / x-admin-key)
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    clientKey = match[1].trim();
  } else if (request.headers.get("x-admin-key")) {
    clientKey = request.headers.get("x-admin-key").trim();
  } else if (request.headers.get("admin-key")) {
    clientKey = request.headers.get("admin-key").trim();
  }

  // 3. Jika tidak ada di Header, baca dari JSON Body
  if (!clientKey) {
    try {
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      clientKey = (body.key || body.adminKey || body.admin_key || body.password || "").trim();
    } catch (e) {
      // Body bukan JSON / kosong
    }
  }

  // 4. Cocokkan key
  if (clientKey && clientKey === serverKey.trim()) {
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Admin key salah." }, 401);
}
