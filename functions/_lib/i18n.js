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
    adblockTitle: "Pop-up / AdBlock Terdeteksi",
    adblockDesc: "Browser Anda memblokir pembukaan tab baru. Harap <strong>matikan AdBlock / izinkan Pop-up</strong> pada browser Anda untuk melanjutkan akses link download, atau gunakan browser <strong>Google Chrome</strong>.",
    adblockRetryBtn: "Saya Sudah Matikan / Coba Lagi",
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
    adblockTitle: "Pop-up / AdBlock Detected",
    adblockDesc: "Your browser blocked opening a new tab. Please <strong>disable AdBlock / allow Pop-ups</strong> on your browser to proceed to download, or use <strong>Google Chrome</strong> browser.",
    adblockRetryBtn: "I Disabled It / Try Again",
  },
};

export function getLocaleFromRequest(request) {
  const country = request?.cf?.country;
  if (country === "ID") {
    return "id";
  }

  const acceptLang = request?.headers?.get("accept-language") || "";
  if (acceptLang.toLowerCase().includes("id")) {
    return "id";
  }

  if (country && country !== "ID") {
    return "en";
  }

  return "en";
}

export function getStrings(countryOrRequest) {
  if (typeof countryOrRequest === "object" && countryOrRequest !== null) {
    const locale = getLocaleFromRequest(countryOrRequest);
    return STRINGS[locale];
  }
  return countryOrRequest === "ID" ? STRINGS.id : STRINGS.en;
}

export function getLocale(countryOrRequest) {
  if (typeof countryOrRequest === "object" && countryOrRequest !== null) {
    return getLocaleFromRequest(countryOrRequest);
  }
  return countryOrRequest === "ID" ? "id" : "en";
}
