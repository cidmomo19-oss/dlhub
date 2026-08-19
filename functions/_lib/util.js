export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateId(length = 7) {
  const chars = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function checkAdmin(request, env, body = null) {
  const serverKey = env.ADMIN_KEY;
  if (!serverKey || typeof serverKey !== "string" || serverKey.trim() === "") {
    return false;
  }

  // Cek dari Header
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  let clientKey = match ? match[1].trim() : (
    request.headers.get("x-admin-key") ||
    request.headers.get("admin-key") ||
    ""
  ).trim();

  // Cek dari Body jika dikirim
  if (!clientKey && body && typeof body === "object") {
    clientKey = (body.key || body.adminKey || body.admin_key || body.password || "").trim();
  }

  return clientKey === serverKey.trim();
}
