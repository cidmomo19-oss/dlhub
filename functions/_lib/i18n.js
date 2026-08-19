export function getMessages(country) {
  const isId = country === "ID";

  if (isId) {
    return {
      lang: "id",
      title: "Pilih Server Download",
      serversLabel: "PILIH SERVER DOWNLOAD",
      hint: "Tips: Jika salah satu server lambat, limit, atau error, silakan pilih server alternatif di atas.",
      notFoundTitle: "Halaman Tidak Ditemukan",
      notFoundDesc: "Link download ini mungkin sudah kadaluarsa atau URL yang kamu masukkan salah.",
      backHome: "Kembali"
    };
  }

  return {
    lang: "en",
    title: "Choose Download Server",
    serversLabel: "AVAILABLE SERVERS",
    hint: "Tip: If a server is slow, rate-limited, or broken, please try one of the other mirrors above.",
    notFoundTitle: "Page Not Found",
    notFoundDesc: "This download link may have expired or the URL is incorrect.",
    backHome: "Go Back"
  };
}
