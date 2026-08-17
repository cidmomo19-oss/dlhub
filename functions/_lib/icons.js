// Set ikon generik (bukan logo brand) — dipakai buat badge tiap tombol server.
// Kalau nambah ikon baru, tambahin juga di public/app.js (ICONS) biar sinkron.

export const ICON_PATHS = {
  cloud:
    '<path d="M6.5 18a4.5 4.5 0 0 1-.4-8.98A5.5 5.5 0 0 1 16.3 7.6 4.75 4.75 0 0 1 18.5 18h-12z"/>',
  package:
    '<path d="M3 8.2 12 3l9 5.2M3 8.2 12 13l9-5.2M3 8.2v7.6L12 21m0-8v8m0-8L21 8.2m0 7.6L12 21"/>',
  bolt:
    '<path d="M13 2 4 14h6.5L10 22l9.5-13H13z"/>',
  folder:
    '<path d="M3.5 7.2a2 2 0 0 1 2-2h4.2l2 2H18.5a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  drive:
    '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 17h.01M10 17h.01"/>',
  shield:
    '<path d="M12 2.5 4.5 5.5v5.7c0 4.9 3.2 8.3 7.5 9.8 4.3-1.5 7.5-4.9 7.5-9.8V5.5z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-6-3.8-9S9.5 5.6 12 3z"/>',
  drop:
    '<path d="M12 2.3c-4 5.6-8 9.4-8 13.2a8 8 0 0 0 16 0c0-3.8-4-7.6-8-13.2z"/>',
  stack:
    '<path d="M12 2 2.5 7 12 12l9.5-5z"/><path d="M2.5 12 12 17l9.5-5"/><path d="M2.5 16.7 12 21.7l9.5-5"/>',
  download:
    '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
};

export const ICON_KEYS = Object.keys(ICON_PATHS);

export function iconSvg(key, size = 20) {
  const path = ICON_PATHS[key] || ICON_PATHS.download;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
