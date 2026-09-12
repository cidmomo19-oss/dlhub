-- DLHUB — skema database (Cloudflare D1 / SQLite)
-- Jalankan: wrangler d1 execute <NAMA_DB> --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS links (
  id              TEXT PRIMARY KEY,       -- kode acak, contoh: "aB3xK9j"
  title           TEXT,                   -- nama paket/file (opsional)
  description     TEXT,                   -- catatan (opsional)
  thumbnail       TEXT,                   -- url thumbnail (opsional)
  servers         TEXT NOT NULL,          -- JSON array: [{label, url, color, expiry_days, last_clicked_at}, ...]
  created_at      INTEGER NOT NULL,       -- unix ms
  last_checked_at INTEGER NOT NULL,       -- unix ms (diperbarui saat klik/cek)
  expiry_days     INTEGER NOT NULL DEFAULT 30, -- default fallback (hari)
  views           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at);
CREATE INDEX IF NOT EXISTS idx_links_last_checked_at ON links (last_checked_at);
