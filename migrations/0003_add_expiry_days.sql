-- Jalankan ini SATU KALI kalau database kamu udah pernah di-deploy sebelum
-- fitur expiry_days ada.
--
-- Lokal:  wrangler d1 execute dlhub-db --local  --file=./migrations/0003_add_expiry_days.sql
-- Remote: wrangler d1 execute dlhub-db --remote --file=./migrations/0003_add_expiry_days.sql

ALTER TABLE links ADD COLUMN expiry_days INTEGER NOT NULL DEFAULT 30;
