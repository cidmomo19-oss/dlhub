// Preset server yang umum dipakai. Ini CUMA nentuin default label/warna/ikon
// pas dipilih di dropdown — bebas diedit, dan bisa nambah host baru di sini
// kapan aja (itu maksud "universal"-nya). Ikon harus salah satu dari
// functions/_lib/icons.js biar sinkron sama tampilan halaman hasil.
const HOSTS = [
  { value: "gofile", label: "Gofile", color: "#00c58e", icon: "package" },
  { value: "pixeldrain", label: "Pixeldrain", color: "#29b6a8", icon: "drop" },
  { value: "mega", label: "MEGA", color: "#e0342d", icon: "bolt" },
  { value: "terabox", label: "TeraBox", color: "#3b82f6", icon: "cloud" },
  { value: "mediafire", label: "MediaFire", color: "#1299d8", icon: "folder" },
  { value: "gdrive", label: "Google Drive", color: "#34a853", icon: "drive" },
  { value: "krakenfiles", label: "KrakenFiles", color: "#7c3aed", icon: "shield" },
  { value: "buzzheavier", label: "Buzzheavier", color: "#f59e0b", icon: "stack" },
  { value: "onefichier", label: "1Fichier", color: "#0ea5e9", icon: "globe" },
  { value: "custom", label: "Custom", color: "#ff8a1e", icon: "download" },
];

const laneRows = document.getElementById("laneRows");
const addLaneBtn = document.getElementById("addLane");
const form = document.getElementById("createForm");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const adminKeyInput = document.getElementById("adminKey");
const resultBox = document.getElementById("resultBox");
const resultLink = document.getElementById("resultLink");
const openBtn = document.getElementById("openBtn");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");
const toast = document.getElementById("toast");

function hostOptionsHtml() {
  return HOSTS.map((h) => `<option value="${h.value}">${h.label}</option>`).join("");
}

function addLaneRow(presetValue) {
  const row = document.createElement("div");
  row.className = "lane-row";
  row.innerHTML = `
    <div class="lane-row-top">
      <select class="lane-host">${hostOptionsHtml()}</select>
      <button type="button" class="lane-remove" aria-label="Hapus server">×</button>
    </div>
    <div class="lane-row-fields">
      <input type="text" class="lane-label" placeholder="Nama server" maxlength="40">
      <input type="url" class="lane-url" placeholder="https://link-download-kamu">
    </div>
  `;

  const select = row.querySelector(".lane-host");
  const labelInput = row.querySelector(".lane-label");

  function applyPreset() {
    const preset = HOSTS.find((h) => h.value === select.value) || HOSTS[HOSTS.length - 1];
    labelInput.value = preset.label;
  }

  select.value = presetValue || HOSTS[0].value;
  applyPreset();
  select.addEventListener("change", applyPreset);

  row.querySelector(".lane-remove").addEventListener("click", () => {
    if (laneRows.children.length <= 1) return;
    row.remove();
  });

  laneRows.appendChild(row);
}

addLaneBtn.addEventListener("click", () => addLaneRow());

function resetLanes() {
  laneRows.innerHTML = "";
  addLaneRow("gofile");
  addLaneRow("terabox");
}
resetLanes();

// Inget admin key di browser ini biar nggak ketik ulang tiap buat halaman
const savedKey = localStorage.getItem("dlhub_admin_key");
if (savedKey) adminKeyInput.value = savedKey;

function showError(msg) {
  formError.textContent = msg;
  formError.classList.add("show");
}
function clearError() {
  formError.textContent = "";
  formError.classList.remove("show");
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();

  const servers = [];
  laneRows.querySelectorAll(".lane-row").forEach((row) => {
    const url = row.querySelector(".lane-url").value.trim();
    if (!url) return;
    const hostValue = row.querySelector(".lane-host").value;
    const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
    const label = row.querySelector(".lane-label").value.trim() || preset.label;
    servers.push({ label, url, color: preset.color, icon: preset.icon });
  });

  if (servers.length === 0) {
    showError("Isi minimal 1 link server yang valid.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Membuat...";

  try {
    const res = await fetch("/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKeyInput.value,
      },
      body: JSON.stringify({ title, description, servers }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Gagal membuat halaman.");
      return;
    }

    if (adminKeyInput.value) localStorage.setItem("dlhub_admin_key", adminKeyInput.value);

    resultLink.value = data.url;
    openBtn.href = data.url;
    form.style.display = "none";
    resultBox.classList.add("show");
  } catch (err) {
    showError("Nggak bisa konek ke server. Coba lagi.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Buat halaman";
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultLink.value);
    showToast("Link disalin ✓");
  } catch {
    resultLink.select();
    document.execCommand("copy");
    showToast("Link disalin ✓");
  }
});

resetBtn.addEventListener("click", () => {
  resultBox.classList.remove("show");
  form.style.display = "";
  document.getElementById("title").value = "";
  document.getElementById("description").value = "";
  resetLanes();
});
