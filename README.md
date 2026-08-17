# DLHUB

Web buat bikin halaman "pilih server download" — satu link, isinya beberapa
tombol server (Gofile, Pixeldrain, Mega, TeraBox, dst). Tiap halaman punya
ID acak sendiri (`namamu.pages.dev/aB3xK9j`). Dibangun di atas **Cloudflare
Pages + Pages Functions + D1**, dengan cache agresif di edge biar hemat kuota
gratisan.

Daftar server itu **universal** — bukan kolom tetap di database, tapi array
JSON bebas. Nambah server baru = tinggal nambah 1 baris preset di
`public/app.js`, nggak perlu ubah skema database atau kode backend.

## Struktur folder

```
dlhub/
├── schema.sql                  -> skema tabel D1
├── wrangler.toml                -> config buat local dev
├── functions/
│   ├── [id].js                  -> render halaman /<id>, cache agresif
│   ├── _lib/icons.js             -> set ikon generik (bukan logo brand)
│   ├── _lib/util.js              -> helper (generate id, escape html, dst)
│   └── api/create.js            -> POST /api/create -> bikin halaman baru
└── public/
    ├── index.html                -> form pembuat halaman
    ├── style.css                 -> desain (dipakai form & halaman hasil)
    ├── app.js                    -> logic form + daftar preset host
    ├── favicon.svg
    └── robots.txt                -> blokir crawler (hemat kuota + privasi)
```

## 1. Development lokal

Butuh Node.js. Install wrangler (CLI Cloudflare) sekali di project ini:

```bash
npm install
cp .dev.vars.example .dev.vars   # isi ADMIN_KEY kalau mau tes proteksi
npm run db:migrate:local          # bikin tabel di D1 lokal (SQLite virtual)
npm run dev                       # jalanin di http://localhost:8788
```

## 2. Push ke GitHub

```bash
git init
git add .
git commit -m "init dlhub"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## 3. Setup di Cloudflare

**a) Buat database D1**

Dashboard Cloudflare -> **Workers & Pages -> D1** -> Create database, kasih
nama misal `dlhub-db`. Lalu jalankan migrasi ke database remote:

```bash
wrangler login
wrangler d1 execute dlhub-db --remote --file=./schema.sql
```

**b) Buat project Pages dari repo GitHub**

Dashboard -> **Workers & Pages -> Create -> Pages -> Connect to Git** ->
pilih repo kamu. Build settings-nya kosongin aja (nggak ada build step,
langsung serve folder `public`):

- Build command: *(kosongkan)*
- Build output directory: `public`

**c) Bind database D1 ke project Pages**

Project -> **Settings -> Functions -> D1 database bindings** -> Add binding:

- Variable name: `DB` (harus persis ini, sesuai kode di `functions/`)
- D1 database: `dlhub-db`

**d) (Opsional tapi disaranin) Set admin key**

Project -> **Settings -> Environment variables** -> tambah variable
`ADMIN_KEY` (pilih **Encrypt**), isi password bebas. Ini yang bikin cuma
kamu yang bisa bikin halaman baru lewat form — kalau nggak di-set, form-nya
kebuka buat siapa aja yang nemu URL-nya.

Setelah bind D1 + set env var, **redeploy** project sekali (Deployments ->
Retry deployment) biar binding-nya kepasang di build yang aktif.

Selesai — tiap `git push` ke `main` bakal auto-deploy.

## Cara kerja caching (biar awet di kuota gratis)

- Halaman `/<id>` dicek ke **Cache API** Cloudflare dulu sebelum nyentuh D1.
  Kalau sudah pernah diakses & masih ke-cache, request itu **nggak nyampe
  ke D1 sama sekali**.
- Response halaman dikasih header `Cache-Control: max-age=31536000,
  immutable` — dianggap nggak berubah lagi setelah dibuat, jadi CDN Cloudflare
  nyimpennya lama.
- File statis (`style.css`, `app.js`, `favicon.svg`) otomatis dilayani
  langsung dari `public/` oleh Cloudflare Pages tanpa lewat Function sama
  sekali — nggak makan kuota Functions/D1.
- `robots.txt` ngeblok semua crawler biar nggak ada bot yang nyasar-nyasar
  buka ribuan URL acak dan boros kuota.

**Trade-off yang perlu kamu tau:** counter `views` di database itu
*best-effort* — cuma nambah pas request itu **cache MISS** (pertama kali
diakses dari suatu lokasi edge). Begitu halaman "dingin"/ke-cache, kunjungan
berikutnya nggak nambahin angka. Ini konsekuensi sadar demi hemat write ke
D1 — kalau butuh angka view yang presisi, sebaiknya pakai Cloudflare Web
Analytics (gratis, terpisah dari D1) daripada nyimpen di database.

Kalau nanti kamu nambah fitur edit link, jangan lupa **purge cache** URL
tersebut manual dari dashboard (Caching -> Configuration -> Purge by URL),
soalnya cache-nya didesain immutable/lama banget.

## Nambah server/host baru

Buka `public/app.js`, tambah 1 objek ke array `HOSTS`:

```js
{ value: "mediafire2", label: "Nama Server", color: "#ff0055", icon: "cloud" }
```

`icon` harus salah satu key yang ada di `functions/_lib/icons.js`
(`cloud`, `package`, `bolt`, `folder`, `drive`, `shield`, `globe`, `drop`,
`stack`, `download`). Nggak perlu ubah database atau backend sama sekali —
warna & ikon ikut kesimpen di tiap halaman pas dibuat.

## Keamanan singkat

- Endpoint `/api/create` divalidasi: URL harus http/https, jumlah server
  dibatasi 15 per halaman, semua teks di-escape sebelum dirender ke HTML.
- ID pakai 7 karakter acak dari alfabet yang ngilangin huruf/angka yang
  gampang ketuker (`0/O`, `1/l/I`) — total kombinasi ratusan miliar, jadi
  nggak bisa ditebak asal-asalan.
- Set `ADMIN_KEY` kalau situs ini bakal diakses publik, biar cuma kamu yang
  bisa generate halaman baru.
