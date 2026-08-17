-- DLHUB — skema database (Cloudflare D1 / SQLite)
-- Jalankan: wrangler d1 execute <NAMA_DB> --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS links (
  id         TEXT PRIMARY KEY,       -- kode acak, contoh: "aB3xK9j"
  title      TEXT,                   -- nama paket/file (opsional)
  description TEXT,                  -- catatan (opsional)
  servers    TEXT NOT NULL,          -- JSON array: [{label,url,color,icon}, ...]
  created_at INTEGER NOT NULL,       -- unix ms
  views      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at);
