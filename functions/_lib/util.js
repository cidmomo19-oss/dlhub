// Alfabet tanpa karakter yang gampang ketuker (0/O, 1/l/I)
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function generateId(length = 7) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < length; i++) id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return id;
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", ...extraHeaders },
  });
}

export function isSafeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

// Dipakai di semua endpoint /api/* yang butuh admin key lewat header
// x-admin-key. Balikin null kalau lolos, atau Response siap-pakai kalau
// ditolak (tinggal `return`).
export function checkAdmin(request, env) {
  if (!env.ADMIN_KEY) {
    return jsonResponse({ error: "ADMIN_KEY belum di-set di server. Buka README." }, 500);
  }
  const provided = request.headers.get("x-admin-key") || "";
  if (provided !== env.ADMIN_KEY) {
    return jsonResponse({ error: "Admin key salah." }, 401);
  }
  return null;
}
