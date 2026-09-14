import { escapeHtml } from "./_lib/util.js";
import { getStrings, getLocale } from "./_lib/i18n.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const cache = caches.default;

  const locale = getLocale(request);
  const t = getStrings(request);

  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("__lang", locale);
  const cacheKey = new Request(cacheUrl.toString(), {
    headers: request.headers,
  });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const id = params.id;
  let response;

  if (!env.DB) {
    response = htmlResponse(renderError(t, "D1 belum ke-bind ke project ini."), 500, "public, max-age=10");
    return response;
  }

  const row = await env.DB.prepare(
    "SELECT id, title, description, thumbnail, servers, views FROM links WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) {
    response = htmlResponse(renderNotFound(t, id), 404, "public, max-age=120");
  } else {
    let servers = [];
    try {
      servers = JSON.parse(row.servers);
    } catch {
      servers = [];
    }

    response = htmlResponse(
      renderPage(t, row, servers),
      200,
      "public, max-age=31536000, s-maxage=31536000, immutable"
    );

    context.waitUntil(
      env.DB.prepare("UPDATE links SET views = views + 1 WHERE id = ?").bind(id).run()
    );
  }

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function htmlResponse(html, status, cacheControl) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": cacheControl,
    },
  });
}

function layout({ title, body, htmlLang, t }) {
  const adblockTitle = t?.adblockTitle || "Pop-up / AdBlock Detected";
  const adblockDesc = t?.adblockDesc || "Your browser blocked opening a new tab. Please disable AdBlock / allow Pop-ups to proceed.";
  const adblockRetryBtn = t?.adblockRetryBtn || "I Disabled It / Try Again";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${body}

<!-- Modal Warning AdBlock / Popup Blocker -->
<div class="adblock-modal-overlay" id="adblockModal" style="display:none;">
  <div class="adblock-modal-card">
    <div class="adblock-icon">🛡️</div>
    <h2 class="adblock-title">${escapeHtml(adblockTitle)}</h2>
    <p class="adblock-desc">${adblockDesc}</p>
    <div class="adblock-actions">
      <button type="button" class="adblock-btn-retry" id="adblockRetryBtn">${escapeHtml(adblockRetryBtn)}</button>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  var adblockModal = document.getElementById('adblockModal');
  var adblockRetryBtn = document.getElementById('adblockRetryBtn');
  var lastTargetUrl = null;

  if (adblockRetryBtn) {
    adblockRetryBtn.addEventListener('click', function() {
      adblockModal.style.display = 'none';
      if (lastTargetUrl) {
        tryOpenTab(lastTargetUrl);
      }
    });
  }

  function tryOpenTab(downloadUrl) {
    lastTargetUrl = downloadUrl;
    var newWin = null;
    try {
      newWin = window.open(downloadUrl, '_blank');
    } catch (err) {
      newWin = null;
    }

    // Periksa apakah tab baru berhasil dibuka atau diblokir (popup blocker / adblocker)
    var isBlocked = false;
    if (!newWin || typeof newWin === 'undefined') {
      isBlocked = true;
    } else {
      try {
        if (newWin.closed || typeof newWin.closed === 'undefined') {
          isBlocked = true;
        }
      } catch (e) {
        isBlocked = false;
      }
    }

    if (isBlocked) {
      if (adblockModal) adblockModal.style.display = 'flex';
    } else {
      // Tab baru berhasil terbuka, alihkan tab lama ke iklan
      window.location.href = 'https://loix.lol/url';
    }
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.server-btn');
    if (btn) {
      e.preventDefault();
      var downloadUrl = btn.getAttribute('data-href') || btn.getAttribute('href');
      tryOpenTab(downloadUrl);
    }
  });
});
</script>
</body>
</html>`;
}

function renderPage(t, row, servers) {
  const title = row.title?.trim() || t.defaultTitle;
  const description = row.description?.trim() || "";
  const thumbnail = row.thumbnail?.trim() || "";

  const downloadIcon =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></svg>';

  const items = servers
    .map(
      (s, idx) => `
      <button type="button" class="server-btn" data-href="/go/${escapeHtml(row.id)}/${idx}" data-id="${escapeHtml(row.id)}" data-index="${idx}">
        <span class="server-btn-label">${escapeHtml(s.label)}</span>
        <span class="server-btn-icon" aria-hidden="true">${downloadIcon}</span>
      </button>`
    )
    .join("");

  const thumbnailHtml = thumbnail
    ? `<div class="thumbnail"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"></div>`
    : "";

  const body = `
  <main class="page">
    <div class="card">
      ${thumbnailHtml}
      <div class="card-body">
        <h1 class="title">${escapeHtml(title)}</h1>
        ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ""}

        <p class="servers-label">${t.serversLabel(servers.length)}</p>
        <div class="server-list">
          ${items}
        </div>

        <p class="hint">${t.hint}</p>
      </div>
    </div>
  </main>`;

  return layout({ title: `${title} — ${t.pageTitleSuffix}`, body, htmlLang: t.htmlLang, t });
}

function renderNotFound(t, id) {
  const body = `
  <main class="page">
    <div class="card">
      <div class="card-body empty-state">
        <h1 class="title">${t.notFoundTitle}</h1>
        <p class="desc">${t.notFoundDesc(escapeHtml(id))}</p>
        <a class="back-link" href="/">${t.backLink}</a>
      </div>
    </div>
  </main>`;
  return layout({ title: t.notFoundPageTitle, body, htmlLang: t.htmlLang, t });
}

function renderError(t, message) {
  const body = `
  <main class="page">
    <div class="card">
      <div class="card-body empty-state">
        <h1 class="title">${t.errorTitle}</h1>
        <p class="desc">${escapeHtml(message)}</p>
      </div>
    </div>
  </main>`;
  return layout({ title: t.errorPageTitle, body, htmlLang: t.htmlLang, t });
}
