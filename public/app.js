// Preset server yang umum dipakai. Ini CUMA nentuin default label/warna pas
// dipilih di dropdown — bebas diedit, dan bisa nambah host baru di sini
// kapan aja (itu maksud "universal"-nya).
const HOSTS = [
  { value: "gofile", label: "Gofile", color: "#00c58e" },
  { value: "pixeldrain", label: "Pixeldrain", color: "#29b6a8" },
  { value: "mega", label: "MEGA", color: "#e0342d" },
  { value: "terabox", label: "TeraBox", color: "#3b82f6" },
  { value: "mediafire", label: "MediaFire", color: "#1299d8" },
  { value: "gdrive", label: "Google Drive", color: "#34a853" },
  { value: "krakenfiles", label: "KrakenFiles", color: "#7c3aed" },
  { value: "buzzheavier", label: "Buzzheavier", color: "#f59e0b" },
  { value: "onefichier", label: "1Fichier", color: "#0ea5e9" },
  { value: "custom", label: "Custom", color: "#ff8a1e" },
];

const STORAGE_KEY = "dlhub_admin_key";

// ---------- Gate (admin key) ----------

const gateView = document.getElementById("gateView");
const createView = document.getElementById("createView");
const gateForm = document.getElementById("gateForm");
const gateKeyInput = document.getElementById("gateKey");
const gateError = document.getElementById("gateError");
const gateSubmitBtn = document.getElementById("gateSubmitBtn");

let verifiedKey = "";

async function verifyKey(key) {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok, error: data.error };
}

function unlock(key) {
  verifiedKey = key;
  gateView.style.display = "none";
  createView.style.display = "";
}

function showGateError(msg) {
  gateError.textContent = msg;
  gateError.classList.add("show");
}

gateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  gateError.classList.remove("show");
  const key = gateKeyInput.value;
  if (!key) return;

  gateSubmitBtn.disabled = true;
  gateSubmitBtn.textContent = "Mengecek...";
  try {
    const { ok, error } = await verifyKey(key);
    if (!ok) {
      showGateError(error || "Admin key salah.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, key);
    unlock(key);
  } catch {
    showGateError("Nggak bisa konek ke server. Coba lagi.");
  } finally {
    gateSubmitBtn.disabled = false;
    gateSubmitBtn.textContent = "Masuk";
  }
});

(async function initGate() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const { ok } = await verifyKey(saved);
    if (ok) {
      unlock(saved);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Offline/error pas cek awal — biarin gate tampil, user bisa coba manual.
  }
})();

// ---------- Create form (baru aktif setelah gate ke-buka) ----------

const laneRows = document.getElementById("laneRows");
const addLaneBtn = document.getElementById("addLane");
const form = document.getElementById("createForm");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
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
    servers.push({ label, url, color: preset.color });
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
        "x-admin-key": verifiedKey,
      },
      body: JSON.stringify({ title, description, servers }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Gagal membuat halaman.");
      return;
    }

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
