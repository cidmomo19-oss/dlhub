// String buat halaman download (functions/[id].js), dipilih berdasarkan
// negara visitor (request.cf.country dari Cloudflare). "ID" -> Indonesia,
// selain itu -> Inggris. Kata "download" sengaja dipertahankan apa adanya
// di versi Indonesia (bukan "unduh") karena udah umum dipakai.
//
// Halaman /admin (create) nggak ikut di-translate — itu cuma dipakai
// pemilik situs sendiri (di belakang gerbang admin key).

const STRINGS = {
  id: {
    htmlLang: "id",
    defaultTitle: "Paket download",
    pageTitleSuffix: "Pilih Server Download",
    serversLabel: (n) => `Server download (${n})`,
    hint: "Pilih salah satu server di atas untuk mulai download. Kalau satu server error atau lambat, coba server lain di daftar.",
    notFoundPageTitle: "Halaman tidak ditemukan — DLHUB",
    notFoundTitle: "Halaman nggak ketemu",
    notFoundDesc: (id) => `Kode <strong>${id}</strong> nggak ada di database, salah ketik, atau memang belum pernah dibuat.`,
    backLink: "← Buat halaman baru",
    errorPageTitle: "Error — DLHUB",
    errorTitle: "Terjadi kesalahan",
  },
  en: {
    htmlLang: "en",
    defaultTitle: "Download package",
    pageTitleSuffix: "Choose a Download Server",
    serversLabel: (n) => `Download servers (${n})`,
    hint: "Pick one of the servers above to start your download. If a server is down or slow, try another one from the list.",
    notFoundPageTitle: "Page not found — DLHUB",
    notFoundTitle: "Page not found",
    notFoundDesc: (id) => `The code <strong>${id}</strong> doesn't exist, was mistyped, or was never created.`,
    backLink: "← Back to home",
    errorPageTitle: "Error — DLHUB",
    errorTitle: "Something went wrong",
  },
};

// country = ISO 3166-1 alpha-2 kode negara dari request.cf.country
// (Cloudflare ngisi ini otomatis berdasarkan IP visitor). Kalau nggak ada
// (misal pas local dev tanpa emulasi geo), default-nya Inggris.
export function getStrings(country) {
  return country === "ID" ? STRINGS.id : STRINGS.en;
}

export function getLocale(country) {
  return country === "ID" ? "id" : "en";
}
