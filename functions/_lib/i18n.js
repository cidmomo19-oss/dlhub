export function getMessages(country) {
  const isId = country === "ID";

  if (isId) {
    return {
      lang: "id",
      defaultTitle: "Pilihan Server Download",
      serversLabel: "SERVER TERSEDIA",
      hint: "Tips: Kalau link mati, lambat, atau kena limit kuota, coba pilih server download yang lain di atas.",
      notFoundTitle: "Halaman tidak ditemukan",
      notFoundDesc: "Link download ini mungkin sudah kadaluarsa atau URL salah.",
      backHome: "Kembali"
    };
  }

  return {
    lang: "en",
    defaultTitle: "Download Mirrors",
    serversLabel: "AVAILABLE SERVERS",
    hint: "Tip: If one server is slow, down, or rate-limited, try another download mirror above.",
    notFoundTitle: "Page not found",
    notFoundDesc: "This download link may have expired or the URL is invalid.",
    backHome: "Go back"
  };
}
