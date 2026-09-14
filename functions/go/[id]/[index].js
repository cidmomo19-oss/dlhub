export async function onRequestGet(context) {
  const { env, params } = context;
  const { id, index } = params;

  const serverIdx = parseInt(index, 10);
  if (isNaN(serverIdx) || serverIdx < 0) {
    return new Response("Invalid server index", { status: 400 });
  }

  if (!env.DB) {
    return new Response("Database not available", { status: 500 });
  }

  const row = await env.DB.prepare("SELECT id, servers FROM links WHERE id = ?").bind(id).first();
  if (!row) {
    return new Response("Link not found", { status: 404 });
  }

  let servers = [];
  try {
    servers = typeof row.servers === "string" ? JSON.parse(row.servers) : (row.servers || []);
  } catch {
    servers = [];
  }

  if (serverIdx >= servers.length) {
    return new Response("Server index out of bounds", { status: 404 });
  }

  const server = servers[serverIdx];
  if (!server || !server.url) {
    return new Response("Target URL not found", { status: 404 });
  }

  // Record click timestamp for this specific server
  const now = Date.now();
  servers[serverIdx].last_clicked_at = now;

  // Asynchronously update D1
  context.waitUntil(
    env.DB.prepare("UPDATE links SET last_checked_at = ?, servers = ? WHERE id = ?")
      .bind(now, JSON.stringify(servers), id)
      .run()
  );

  // 302 Redirect visitor to actual download server URL
  return Response.redirect(server.url, 302);
}
