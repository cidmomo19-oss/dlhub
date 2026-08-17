// Preset server yang umum dipakai.
const HOSTS = [
  { value: "gofile", label: "Gofile" },
  { value: "pixeldrain", label: "Pixeldrain" },
  { value: "mega", label: "MEGA" },
  { value: "terabox", label: "TeraBox" },
  { value: "mediafire", label: "MediaFire" },
  { value: "gdrive", label: "Google Drive" },
  { value: "krakenfiles", label: "KrakenFiles" },
  { value: "buzzheavier", label: "Buzzheavier" },
  { value: "onefichier", label: "1Fichier" },
  { value: "custom", label: "Custom" },
];

const authGate = document.getElementById("authGate");
const authForm = document.getElementById("authForm");
const adminKeyGateInput = document.getElementById("adminKeyGate");
const authError = document.getElementById("authError");
const authSubmitBtn = document.getElementById("authSubmitBtn");

const createScreen = document.getElementById("createScreen");
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

let currentAdminKey = localStorage.getItem("dlhub_admin_key") || "";

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

function showCreateScreen() {
  authGate.style.display = "none";
  createScreen.style.display = "block";
  resetLanes();
}

function showAuthGate() {
  authGate.style.display = "flex";
  createScreen.style.display = "none";
  if (currentAdminKey) {
    adminKeyGateInput.value = currentAdminKey;
  }
}

async function verifyAndProceed(keyToTest) {
  authError.textContent = "";
  authError.classList.remove("show");
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Memverifikasi...";

  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyToTest }),
    });
    const data = await res.json();

    if (res.ok) {
      currentAdminKey = keyToTest;
      if (keyToTest) localStorage.setItem("dlhub_admin_key", keyToTest);
      showCreateScreen();
    } else {
      authError.textContent = data.error || "Admin Key tidak valid.";
      authError.classList.add("show");
      showAuthGate();
    }
  } catch (err) {
    authError.textContent = "Gagal terhubung ke server.";
    authError.classList.add("show");
    showAuthGate();
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Masuk Halaman Create";
  }
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputKey = adminKeyGateInput.value.trim();
  verifyAndProceed(inputKey);
});

// Initial load check
if (currentAdminKey) {
  verifyAndProceed(currentAdminKey);
} else {
  // Try verifying with empty key in case ADMIN_KEY env var is not set on server
  verifyAndProceed("");
}

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
    servers.push({ label, url, color: preset.color || "#6366f1", icon: "download" });
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
        "x-admin-key": currentAdminKey,
      },
      body: JSON.stringify({ title, description, servers }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("dlhub_admin_key");
        currentAdminKey = "";
        showAuthGate();
        authError.textContent = "Sesi Admin Key telah kadaluarsa atau salah.";
        authError.classList.add("show");
        return;
      }
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
    submitBtn.textContent = "Buat Halaman";
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
