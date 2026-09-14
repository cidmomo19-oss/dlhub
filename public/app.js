// Preset server
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
const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (gateView) gateView.style.display = "none";
  if (createView) createView.style.display = "";
  loadSchedule();
}

function showGateError(msg) {
  if (gateError) {
    gateError.textContent = msg;
    gateError.classList.add("show");
  }
}

if (gateForm) {
  gateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (gateError) gateError.classList.remove("show");
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
      gateSubmitBtn.textContent = "Masuk Dashboard";
    }
  });
}

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
    // Offline/error
  }
})();

// ---------- Tabs Switcher ----------

const tabListBtn = document.getElementById("tabListBtn");
const tabCreateBtn = document.getElementById("tabCreateBtn");
const listTab = document.getElementById("listTab");
const createTab = document.getElementById("createTab");

function switchTab(targetTab) {
  if (targetTab === "createTab") {
    tabCreateBtn?.classList.add("active");
    tabListBtn?.classList.remove("active");
    if (createTab) createTab.style.display = "block";
    if (listTab) listTab.style.display = "none";
  } else {
    tabListBtn?.classList.add("active");
    tabCreateBtn?.classList.remove("active");
    if (listTab) listTab.style.display = "block";
    if (createTab) createTab.style.display = "none";
  }
}

if (tabListBtn) tabListBtn.addEventListener("click", () => switchTab("listTab"));
if (tabCreateBtn) tabCreateBtn.addEventListener("click", () => switchTab("createTab"));

// ---------- Create form ----------

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
const thumbnailInput = document.getElementById("thumbnail");
const thumbPreview = document.getElementById("thumbPreview");
const thumbPreviewImg = document.getElementById("thumbPreviewImg");

if (thumbnailInput && thumbPreviewImg) {
  thumbnailInput.addEventListener("input", () => {
    const url = thumbnailInput.value.trim();
    if (!url) {
      thumbPreview.style.display = "none";
      return;
    }
    thumbPreviewImg.src = url;
  });
  thumbPreviewImg.addEventListener("load", () => {
    thumbPreview.style.display = "";
  });
  thumbPreviewImg.addEventListener("error", () => {
    thumbPreview.style.display = "none";
  });
}

const toggleMassBtn = document.getElementById("toggleMassBtn");
const massInputBox = document.getElementById("massInputBox");
const massInputText = document.getElementById("massInputText");
const massApplyBtn = document.getElementById("massApplyBtn");

function detectHost(url, label) {
  const combined = (url + " " + label).toLowerCase();
  if (combined.includes("gofile")) return "gofile";
  if (combined.includes("pixeldrain")) return "pixeldrain";
  if (combined.includes("mega.nz") || combined.includes("mega.io") || combined.includes("mega")) return "mega";
  if (combined.includes("terabox")) return "terabox";
  if (combined.includes("mediafire")) return "mediafire";
  if (combined.includes("drive.google") || combined.includes("gdrive") || combined.includes("google drive")) return "gdrive";
  if (combined.includes("krakenfiles") || combined.includes("kraken")) return "krakenfiles";
  if (combined.includes("buzzheavier")) return "buzzheavier";
  if (combined.includes("1fichier") || combined.includes("onefichier")) return "onefichier";
  return "custom";
}

if (toggleMassBtn && massInputBox) {
  toggleMassBtn.addEventListener("click", () => {
    const isHidden = massInputBox.style.display === "none";
    massInputBox.style.display = isHidden ? "block" : "none";
    toggleMassBtn.textContent = isHidden ? "✕ Tutup Mode Massal" : "⚡ Mode Massal (Link | Nama | Hari)";
  });
}

function hostOptionsHtml() {
  return HOSTS.map((h) => `<option value="${h.value}">${h.label}</option>`).join("");
}

function createLaneRowElement(containerElement, presetValue, customLabel, customUrl, customExpiryDays) {
  const row = document.createElement("div");
  row.className = "lane-row";
  row.innerHTML = `
    <div class="lane-row-top">
      <select class="lane-host">${hostOptionsHtml()}</select>
      <button type="button" class="lane-remove" aria-label="Hapus server">×</button>
    </div>
    <div class="lane-row-fields">
      <input type="text" class="lane-label" placeholder="Nama Server" maxlength="40">
      <input type="number" class="lane-expiry" min="1" max="365" value="30" placeholder="Durasi (Hari)">
      <input type="url" class="lane-url" placeholder="https://link-download">
    </div>
  `;

  const select = row.querySelector(".lane-host");
  const labelInput = row.querySelector(".lane-label");
  const expiryInput = row.querySelector(".lane-expiry");
  const urlInput = row.querySelector(".lane-url");

  function applyPreset() {
    const preset = HOSTS.find((h) => h.value === select.value) || HOSTS[HOSTS.length - 1];
    labelInput.value = preset.label;
  }

  select.value = presetValue || HOSTS[0].value;
  if (customLabel !== undefined) {
    labelInput.value = customLabel;
  } else {
    applyPreset();
  }
  if (customUrl !== undefined) urlInput.value = customUrl;
  if (customExpiryDays !== undefined) {
    expiryInput.value = customExpiryDays;
  } else {
    expiryInput.value = 30;
  }

  select.addEventListener("change", applyPreset);

  row.querySelector(".lane-remove").addEventListener("click", () => {
    if (containerElement.children.length <= 1) return;
    row.remove();
  });

  containerElement.appendChild(row);
}

function addLaneRow(presetValue, customLabel, customUrl, customExpiryDays) {
  if (laneRows) createLaneRowElement(laneRows, presetValue, customLabel, customUrl, customExpiryDays);
}

if (massApplyBtn && massInputText) {
  massApplyBtn.addEventListener("click", () => {
    clearError();
    const text = massInputText.value.trim();
    if (!text) {
      showError("Masukkan setidaknya 1 link dalam format: Link | Nama | Hari");
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedEntries = [];

    for (const line of lines) {
      const parts = line.split("|");
      const url = parts[0].trim();
      if (!url) continue;
      const customLabel = parts[1] ? parts[1].trim() : "";
      const customExpiry = parts[2] ? parseInt(parts[2].trim(), 10) : 30;

      const hostValue = detectHost(url, customLabel);
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const finalLabel = customLabel || preset.label;
      const finalExpiry = !isNaN(customExpiry) && customExpiry > 0 ? customExpiry : 30;

      parsedEntries.push({ hostValue, label: finalLabel, url, expiry_days: finalExpiry });
    }

    if (parsedEntries.length === 0) {
      showError("Nggak ada link yang valid dalam teks massal.");
      return;
    }

    laneRows.innerHTML = "";
    parsedEntries.forEach((entry) => {
      addLaneRow(entry.hostValue, entry.label, entry.url, entry.expiry_days);
    });

    showToast(`${parsedEntries.length} server berhasil ditambahkan ✓`);
  });
}

if (addLaneBtn) addLaneBtn.addEventListener("click", () => addLaneRow());

function resetLanes() {
  if (!laneRows) return;
  laneRows.innerHTML = "";
  addLaneRow("gofile");
  addLaneRow("terabox");
}
resetLanes();

function showError(msg) {
  if (formError) {
    formError.textContent = msg;
    formError.classList.add("show");
  }
}
function clearError() {
  if (formError) {
    formError.textContent = "";
    formError.classList.remove("show");
  }
}

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const thumbnail = thumbnailInput ? thumbnailInput.value.trim() : "";

    const servers = [];
    laneRows.querySelectorAll(".lane-row").forEach((row) => {
      const url = row.querySelector(".lane-url").value.trim();
      if (!url) return;
      const hostValue = row.querySelector(".lane-host").value;
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const label = row.querySelector(".lane-label").value.trim() || preset.label;
      const expiry_days = parseInt(row.querySelector(".lane-expiry").value, 10) || 30;

      servers.push({ label, url, color: preset.color, expiry_days });
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
        body: JSON.stringify({ title, description, thumbnail, servers }),
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
      loadSchedule();
    } catch {
      showError("Nggak bisa konek ke server. Coba lagi.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Buat Halaman Download";
    }
  });
}

if (copyBtn) {
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
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resultBox.classList.remove("show");
    form.style.display = "";
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    if (thumbnailInput) thumbnailInput.value = "";
    if (thumbPreview) thumbPreview.style.display = "none";
    resetLanes();
  });
}

// ---------- Edit Form Modal ----------

const editModal = document.getElementById("editModal");
const editLinkIdEl = document.getElementById("editLinkId");
const editTitleInput = document.getElementById("editTitle");
const editThumbnailInput = document.getElementById("editThumbnail");
const editThumbPreview = document.getElementById("editThumbPreview");
const editThumbPreviewImg = document.getElementById("editThumbPreviewImg");
const editDescriptionInput = document.getElementById("editDescription");
const editLaneRows = document.getElementById("editLaneRows");
const editAddLaneBtn = document.getElementById("editAddLane");
const editForm = document.getElementById("editForm");
const editFormError = document.getElementById("editFormError");
const editSubmitBtn = document.getElementById("editSubmitBtn");
const editCancelBtn = document.getElementById("editCancelBtn");
const editModalCloseBtn = document.getElementById("editModalCloseBtn");

const editToggleMassBtn = document.getElementById("editToggleMassBtn");
const editMassInputBox = document.getElementById("editMassInputBox");
const editMassInputText = document.getElementById("editMassInputText");
const editMassApplyBtn = document.getElementById("editMassApplyBtn");

let activeEditingId = null;

if (editThumbnailInput && editThumbPreviewImg) {
  editThumbnailInput.addEventListener("input", () => {
    const url = editThumbnailInput.value.trim();
    if (!url) {
      editThumbPreview.style.display = "none";
      return;
    }
    editThumbPreviewImg.src = url;
  });
  editThumbPreviewImg.addEventListener("load", () => {
    editThumbPreview.style.display = "";
  });
  editThumbPreviewImg.addEventListener("error", () => {
    editThumbPreview.style.display = "none";
  });
}

if (editToggleMassBtn && editMassInputBox) {
  editToggleMassBtn.addEventListener("click", () => {
    const isHidden = editMassInputBox.style.display === "none";
    editMassInputBox.style.display = isHidden ? "block" : "none";
    editToggleMassBtn.textContent = isHidden ? "✕ Tutup Mode Massal" : "⚡ Mode Massal";
  });
}

function addEditLaneRow(presetValue, customLabel, customUrl, customExpiryDays) {
  if (editLaneRows) createLaneRowElement(editLaneRows, presetValue, customLabel, customUrl, customExpiryDays);
}

if (editMassApplyBtn && editMassInputText) {
  editMassApplyBtn.addEventListener("click", () => {
    clearEditError();
    const text = editMassInputText.value.trim();
    if (!text) {
      showEditError("Masukkan setidaknya 1 link dalam format: Link | Nama | Hari");
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedEntries = [];

    for (const line of lines) {
      const parts = line.split("|");
      const url = parts[0].trim();
      if (!url) continue;
      const customLabel = parts[1] ? parts[1].trim() : "";
      const customExpiry = parts[2] ? parseInt(parts[2].trim(), 10) : 30;

      const hostValue = detectHost(url, customLabel);
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const finalLabel = customLabel || preset.label;
      const finalExpiry = !isNaN(customExpiry) && customExpiry > 0 ? customExpiry : 30;

      parsedEntries.push({ hostValue, label: finalLabel, url, expiry_days: finalExpiry });
    }

    if (parsedEntries.length === 0) {
      showEditError("Nggak ada link yang valid dalam teks massal.");
      return;
    }

    editLaneRows.innerHTML = "";
    parsedEntries.forEach((entry) => {
      addEditLaneRow(entry.hostValue, entry.label, entry.url, entry.expiry_days);
    });

    showToast(`${parsedEntries.length} server berhasil ditambahkan ✓`);
  });
}

if (editAddLaneBtn) editAddLaneBtn.addEventListener("click", () => addEditLaneRow());

function showEditError(msg) {
  if (editFormError) {
    editFormError.textContent = msg;
    editFormError.classList.add("show");
  }
}

function clearEditError() {
  if (editFormError) {
    editFormError.textContent = "";
    editFormError.classList.remove("show");
  }
}

function closeEditModal() {
  if (editModal) editModal.style.display = "none";
  activeEditingId = null;
  clearEditError();
}

if (editCancelBtn) editCancelBtn.addEventListener("click", closeEditModal);
if (editModalCloseBtn) editModalCloseBtn.addEventListener("click", closeEditModal);

async function openEditModal(id) {
  clearEditError();
  activeEditingId = id;
  if (editLinkIdEl) editLinkIdEl.textContent = id;

  if (editMassInputBox) editMassInputBox.style.display = "none";
  if (editToggleMassBtn) editToggleMassBtn.textContent = "⚡ Mode Massal";
  if (editMassInputText) editMassInputText.value = "";

  if (editModal) editModal.style.display = "flex";

  try {
    const res = await fetch(`/api/links/${id}`, {
      headers: { "x-admin-key": verifiedKey },
    });
    const data = await res.json();
    if (!res.ok) {
      showEditError(data.error || "Gagal memuat detail link.");
      return;
    }

    editTitleInput.value = data.title || "";
    editDescriptionInput.value = data.description || "";
    editThumbnailInput.value = data.thumbnail || "";

    if (data.thumbnail) {
      editThumbPreviewImg.src = data.thumbnail;
      editThumbPreview.style.display = "";
    } else {
      editThumbPreview.style.display = "none";
    }

    editLaneRows.innerHTML = "";
    let servers = Array.isArray(data.servers) ? data.servers : [];
    if (typeof data.servers === "string") {
      try { servers = JSON.parse(data.servers); } catch { servers = []; }
    }
    if (servers.length === 0) {
      addEditLaneRow("gofile");
    } else {
      servers.forEach((s) => {
        const hostVal = detectHost(s.url, s.label);
        addEditLaneRow(hostVal, s.label, s.url, s.expiry_days);
      });
    }
  } catch {
    showEditError("Nggak bisa konek ke server.");
  }
}

if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearEditError();

    if (!activeEditingId) return;

    const title = editTitleInput.value.trim();
    const description = editDescriptionInput.value.trim();
    const thumbnail = editThumbnailInput.value.trim();

    const servers = [];
    editLaneRows.querySelectorAll(".lane-row").forEach((row) => {
      const url = row.querySelector(".lane-url").value.trim();
      if (!url) return;
      const hostValue = row.querySelector(".lane-host").value;
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const label = row.querySelector(".lane-label").value.trim() || preset.label;
      const expiry_days = parseInt(row.querySelector(".lane-expiry").value, 10) || 30;

      servers.push({ label, url, color: preset.color, expiry_days });
    });

    if (servers.length === 0) {
      showEditError("Isi minimal 1 link server yang valid.");
      return;
    }

    editSubmitBtn.disabled = true;
    editSubmitBtn.textContent = "Menyimpan...";

    try {
      const res = await fetch(`/api/links/${activeEditingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": verifiedKey,
        },
        body: JSON.stringify({ title, description, thumbnail, servers }),
      });
      const data = await res.json();

      if (!res.ok) {
        showEditError(data.error || "Gagal menyimpan perubahan.");
        return;
      }

      showToast("Halaman berhasil diperbarui ✓");
      closeEditModal();
      loadSchedule();
    } catch {
      showEditError("Nggak bisa konek ke server. Coba lagi.");
    } finally {
      editSubmitBtn.disabled = false;
      editSubmitBtn.textContent = "Simpan Perubahan";
    }
  });
}

// ---------- Schedule / Links List ----------

const scheduleList = document.getElementById("scheduleList");
const scheduleCount = document.getElementById("scheduleCount");
const scheduleAlertArea = document.getElementById("scheduleAlertArea");

function calculateServerStatus(server, linkLastChecked, linkCreatedAt) {
  const lastClicked = server.last_clicked_at || linkLastChecked || linkCreatedAt || Date.now();
  const expiryDays = server.expiry_days > 0 ? server.expiry_days : 30;
  const expiryTime = lastClicked + expiryDays * DAY_MS;
  const msLeft = expiryTime - Date.now();
  const daysLeft = Math.ceil(msLeft / DAY_MS);

  if (daysLeft <= 0) {
    return {
      cls: "overdue",
      daysLeft,
      expiryDays,
      text: daysLeft === 0 ? "Hari ini" : `Kadaluarsa (${Math.abs(daysLeft)} hr lalu)`,
      isAlert: true,
    };
  }
  if (daysLeft <= 3) {
    return {
      cls: "due-soon",
      daysLeft,
      expiryDays,
      text: `${daysLeft} hr lagi`,
      isAlert: true,
    };
  }
  return {
    cls: "ok",
    daysLeft,
    expiryDays,
    text: `${daysLeft} hr lagi`,
    isAlert: false,
  };
}

function renderSchedule(links) {
  if (!scheduleList) return;

  if (links.length === 0) {
    scheduleList.innerHTML = '<p class="schedule-empty">Belum ada link download yang dibuat.</p>';
    if (scheduleCount) scheduleCount.textContent = "0";
    if (scheduleAlertArea) scheduleAlertArea.innerHTML = "";
    return;
  }

  let totalAlertServers = 0;

  const rowsHtml = links
    .map((l) => {
      let servers = Array.isArray(l.servers) ? l.servers : [];
      if (typeof l.servers === "string") {
        try { servers = JSON.parse(l.servers); } catch { servers = []; }
      }

      let linkHasAlert = false;

      const serverItemsHtml = servers
        .map((s, idx) => {
          const st = calculateServerStatus(s, l.last_checked_at, l.created_at);
          if (st.isAlert) {
            linkHasAlert = true;
            totalAlertServers++;
          }
          return `
            <div class="server-item-row ${st.isAlert ? "status-alert" : ""}">
              <div class="server-info">
                <span class="server-name">${escapeHtmlClient(s.label)}</span>
                <span class="badge-status ${st.cls}">${st.text}</span>
              </div>
              <button type="button" class="btn-check-server" data-id="${l.id}" data-server-index="${idx}">
                ✓ Cek
              </button>
            </div>
          `;
        })
        .join("");

      const titleName = (l.title || "").trim() || "Paket Download";
      return `
      <div class="link-card ${linkHasAlert ? "has-alert" : ""}" data-id="${l.id}">
        <div class="link-card-head">
          <div class="link-card-title-group">
            <h3 class="link-card-title">${escapeHtmlClient(titleName)}</h3>
            <span class="link-card-id">/${l.id}</span>
          </div>
          <div class="link-card-actions">
            <a href="/${l.id}" target="_blank" rel="noopener" class="btn-icon-text">↗ Buka</a>
            <button type="button" class="btn-icon-text edit-btn" data-id="${l.id}">✏️ Edit</button>
            <button type="button" class="btn-icon-text danger delete-btn" data-id="${l.id}">🗑 Hapus</button>
          </div>
        </div>
        <div class="link-servers-grid">${serverItemsHtml}</div>
      </div>`;
    })
    .join("");

  if (scheduleCount) scheduleCount.textContent = `${links.length}`;

  if (scheduleAlertArea) {
    if (totalAlertServers > 0) {
      scheduleAlertArea.innerHTML = `
        <div class="dash-alert-banner">
          ⚠️ <strong>Notifikasi Kadaluarsa:</strong> Ada ${totalAlertServers} server link yang tidak diklik &amp; hampir/sudah kadaluarsa (≤ 3 hari). Harap cek manual!
        </div>`;
    } else {
      scheduleAlertArea.innerHTML = "";
    }
  }

  scheduleList.innerHTML = rowsHtml;
}

function escapeHtmlClient(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSchedule() {
  if (!scheduleList) return;
  try {
    const res = await fetch("/api/links", { headers: { "x-admin-key": verifiedKey } });
    const data = await res.json();
    if (!res.ok) {
      scheduleList.innerHTML = `<p class="schedule-empty">${data.error || "Gagal memuat data link."}</p>`;
      return;
    }
    renderSchedule(data.links || []);
  } catch {
    scheduleList.innerHTML = '<p class="schedule-empty">Nggak bisa konek ke server.</p>';
  }
}

if (scheduleList) {
  scheduleList.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const id = editBtn.dataset.id;
      openEditModal(id);
      return;
    }

    const checkBtn = e.target.closest(".btn-check-server");
    if (checkBtn) {
      const id = checkBtn.dataset.id;
      const serverIndex = parseInt(checkBtn.dataset.serverIndex, 10);

      checkBtn.disabled = true;
      checkBtn.textContent = "Saving...";
      try {
        const res = await fetch(`/api/links/${id}/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": verifiedKey,
          },
          body: JSON.stringify({ serverIndex }),
        });
        if (res.ok) {
          showToast("Server ditandai udah dicek ✓");
          loadSchedule();
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "Gagal nandain server.");
          checkBtn.disabled = false;
          checkBtn.textContent = "✓ Cek";
        }
      } catch {
        showToast("Nggak bisa konek ke server.");
        checkBtn.disabled = false;
        checkBtn.textContent = "✓ Cek";
      }
      return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const card = deleteBtn.closest(".link-card");
      const name = card?.querySelector(".link-card-title")?.textContent || id;

      const sure = confirm(`Yakin mau hapus "${name}" (/${id})?\nAksi ini tidak dapat dibatalkan.`);
      if (!sure) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = "Menghapus...";
      try {
        const res = await fetch(`/api/links/${id}`, {
          method: "DELETE",
          headers: { "x-admin-key": verifiedKey },
        });
        if (res.ok) {
          showToast("Link dihapus ✓");
          loadSchedule();
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "Gagal hapus link.");
          deleteBtn.disabled = false;
          deleteBtn.textContent = "🗑 Hapus";
        }
      } catch {
        showToast("Nggak bisa konek ke server.");
        deleteBtn.disabled = false;
        deleteBtn.textContent = "🗑 Hapus";
      }
    }
  });
}
