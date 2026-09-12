export async function onRequestGet(context) {
  const { env, params, request } = context;

  const id = params.id;
  const index = parseInt(params.index, 10);

  if (!env.DB || isNaN(index) || index < 0) {
    return Response.redirect(new URL("/", request.url), 302);
  }

  const row = await env.DB.prepare("SELECT id, servers FROM links WHERE id = ?")
    .bind(id)
    .first();

  if (!row) {
    return Response.redirect(new URL("/", request.url), 302);
  }

  let servers = [];
  try {
    servers = JSON.parse(row.servers);
  } catch {
    servers = [];
  }

  if (!servers[index] || !servers[index].url) {
    return Response.redirect(new URL(`/${id}`, request.url), 302);
  }

  const targetUrl = servers[index].url;
  const now = Date.now();
  servers[index].last_clicked_at = now;

  context.waitUntil(
    env.DB.prepare("UPDATE links SET servers = ?, last_checked_at = ? WHERE id = ?")
      .bind(JSON.stringify(servers), now, id)
      .run()
  );

  return new Response(null, {
    status: 302,
    headers: {
      "Location": targetUrl,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
