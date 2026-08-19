import { jsonResponse, checkAdmin } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (checkAdmin(request, env)) {
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Admin key salah atau belum di-set di server." }, 401);
}
