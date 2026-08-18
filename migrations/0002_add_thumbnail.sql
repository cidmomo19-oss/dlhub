-- Jalankan ini SATU KALI kalau database kamu udah pernah di-deploy sebelum
-- fitur thumbnail ada. Database baru nggak perlu ini — cukup schema.sql.
--
-- Lokal:  wrangler d1 execute dlhub-db --local  --file=./migrations/0002_add_thumbnail.sql
-- Remote: wrangler d1 execute dlhub-db --remote --file=./migrations/0002_add_thumbnail.sql

ALTER TABLE links ADD COLUMN thumbnail TEXT;
