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
const CHECK_INTERVAL_DAYS = 30;
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
  gateView.style.display = "none";
  createView.style.display = "";
  loadSchedule();
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
const thumbnailInput = document.getElementById("thumbnail");
const thumbPreview = document.getElementById("thumbPreview");
const thumbPreviewImg = document.getElementById("thumbPreviewImg");

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
    toggleMassBtn.textContent = isHidden ? "✕ Tutup Mode Massal" : "⚡ Mode Massal (Link | Nama)";
    if (isHidden && massInputText) {
      massInputText.focus();
    }
  });
}

function hostOptionsHtml() {
  return HOSTS.map((h) => `<option value="${h.value}">${h.label}</option>`).join("");
}

function createLaneRowElement(containerElement, presetValue, customLabel, customUrl) {
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
  if (customUrl !== undefined) {
    urlInput.value = customUrl;
  }

  select.addEventListener("change", applyPreset);

  row.querySelector(".lane-remove").addEventListener("click", () => {
    if (containerElement.children.length <= 1) return;
    row.remove();
  });

  containerElement.appendChild(row);
}

function addLaneRow(presetValue, customLabel, customUrl) {
  createLaneRowElement(laneRows, presetValue, customLabel, customUrl);
}

if (massApplyBtn && massInputText) {
  massApplyBtn.addEventListener("click", () => {
    clearError();
    const text = massInputText.value.trim();
    if (!text) {
      showError("Masukkan setidaknya 1 link dalam format: Link | Nama");
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedEntries = [];

    for (const line of lines) {
      const parts = line.split("|");
      const url = parts[0].trim();
      if (!url) continue;
      const customLabel = parts.slice(1).join("|").trim();
      const hostValue = detectHost(url, customLabel);
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const finalLabel = customLabel || preset.label;

      parsedEntries.push({ hostValue, label: finalLabel, url });
    }

    if (parsedEntries.length === 0) {
      showError("Nggak ada link yang valid dalam teks massal.");
      return;
    }

    laneRows.innerHTML = "";
    parsedEntries.forEach((entry) => {
      addLaneRow(entry.hostValue, entry.label, entry.url);
    });

    showToast(`${parsedEntries.length} server berhasil ditambahkan ✓`);
  });
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
  const thumbnail = thumbnailInput.value.trim();

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
  thumbnailInput.value = "";
  thumbPreview.style.display = "none";
  resetLanes();
});

// ---------- Edit Form Modal Logic ----------

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

if (editThumbnailInput) {
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
    editToggleMassBtn.textContent = isHidden ? "✕ Tutup Mode Massal" : "⚡ Mode Massal (Link | Nama)";
    if (isHidden && editMassInputText) {
      editMassInputText.focus();
    }
  });
}

function addEditLaneRow(presetValue, customLabel, customUrl) {
  createLaneRowElement(editLaneRows, presetValue, customLabel, customUrl);
}

if (editMassApplyBtn && editMassInputText) {
  editMassApplyBtn.addEventListener("click", () => {
    clearEditError();
    const text = editMassInputText.value.trim();
    if (!text) {
      showEditError("Masukkan setidaknya 1 link dalam format: Link | Nama");
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedEntries = [];

    for (const line of lines) {
      const parts = line.split("|");
      const url = parts[0].trim();
      if (!url) continue;
      const customLabel = parts.slice(1).join("|").trim();
      const hostValue = detectHost(url, customLabel);
      const preset = HOSTS.find((h) => h.value === hostValue) || HOSTS[HOSTS.length - 1];
      const finalLabel = customLabel || preset.label;

      parsedEntries.push({ hostValue, label: finalLabel, url });
    }

    if (parsedEntries.length === 0) {
      showEditError("Nggak ada link yang valid dalam teks massal.");
      return;
    }

    editLaneRows.innerHTML = "";
    parsedEntries.forEach((entry) => {
      addEditLaneRow(entry.hostValue, entry.label, entry.url);
    });

    showToast(`${parsedEntries.length} server berhasil ditambahkan ✓`);
  });
}

if (editAddLaneBtn) {
  editAddLaneBtn.addEventListener("click", () => addEditLaneRow());
}

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
  if (editToggleMassBtn) editToggleMassBtn.textContent = "⚡ Mode Massal (Link | Nama)";
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
    } else {
      editThumbPreview.style.display = "none";
    }

    editLaneRows.innerHTML = "";
    const servers = Array.isArray(data.servers) ? data.servers : [];
    if (servers.length === 0) {
      addEditLaneRow("gofile");
    } else {
      servers.forEach((s) => {
        const hostVal = detectHost(s.url, s.label);
        addEditLaneRow(hostVal, s.label, s.url);
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
      servers.push({ label, url, color: preset.color });
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

// ---------- Jadwal cek link (tiap 30 hari sekali) ----------

const scheduleList = document.getElementById("scheduleList");
const scheduleCount = document.getElementById("scheduleCount");

function scheduleStatus(lastCheckedAt) {
  const daysSince = Math.floor((Date.now() - lastCheckedAt) / DAY_MS);
  const daysLeft = CHECK_INTERVAL_DAYS - daysSince;

  if (daysLeft <= 0) {
    return { cls: "overdue", text: daysLeft === 0 ? "Jatuh tempo hari ini" : `Telat ${Math.abs(daysLeft)} hari` };
  }
  if (daysLeft <= 2) {
    return { cls: "due-soon", text: `${daysLeft} hari lagi` };
  }
  return { cls: "ok", text: `${daysLeft} hari lagi` };
}

function renderSchedule(links) {
  if (links.length === 0) {
    scheduleList.innerHTML = '<p class="schedule-empty">Belum ada halaman yang dibuat.</p>';
    scheduleCount.textContent = "";
    return;
  }

  const overdueCount = links.filter((l) => scheduleStatus(l.last_checked_at).cls === "overdue").length;
  scheduleCount.textContent = overdueCount > 0 ? `${overdueCount} perlu dicek` : `${links.length} link`;

  scheduleList.innerHTML = links
    .map((l) => {
      const status = scheduleStatus(l.last_checked_at);
      const name = (l.title || "").trim() || l.id;
      return `
      <div class="schedule-row" data-id="${l.id}">
        <div class="schedule-info">
          <div class="schedule-name">${escapeHtmlClient(name)}</div>
          <div class="schedule-status ${status.cls}">${status.text}</div>
        </div>
        <div class="schedule-actions">
          <a href="/${l.id}" target="_blank" rel="noopener">Buka</a>
          <button type="button" class="schedule-edit-btn" data-id="${l.id}">Edit</button>
          <button type="button" class="schedule-check-btn" data-id="${l.id}">Tandai sudah dicek</button>
          <button type="button" class="schedule-delete-btn" data-id="${l.id}">Hapus</button>
        </div>
      </div>`;
    })
    .join("");
}

function escapeHtmlClient(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSchedule() {
  try {
    const res = await fetch("/api/links", { headers: { "x-admin-key": verifiedKey } });
    const data = await res.json();
    if (!res.ok) {
      scheduleList.innerHTML = `<p class="schedule-empty">${data.error || "Gagal memuat jadwal."}</p>`;
      return;
    }
    renderSchedule(data.links || []);
  } catch {
    scheduleList.innerHTML = '<p class="schedule-empty">Nggak bisa konek ke server.</p>';
  }
}

scheduleList.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".schedule-edit-btn");
  if (editBtn) {
    const id = editBtn.dataset.id;
    openEditModal(id);
    return;
  }

  const checkBtn = e.target.closest(".schedule-check-btn");
  if (checkBtn) {
    const id = checkBtn.dataset.id;

    checkBtn.disabled = true;
    checkBtn.textContent = "Menyimpan...";
    try {
      const res = await fetch(`/api/links/${id}/check`, {
        method: "POST",
        headers: { "x-admin-key": verifiedKey },
      });
      if (res.ok) {
        showToast("Ditandai udah dicek ✓");
        loadSchedule();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal nandain link.");
        checkBtn.disabled = false;
        checkBtn.textContent = "Tandai sudah dicek";
      }
    } catch {
      showToast("Nggak bisa konek ke server.");
      checkBtn.disabled = false;
      checkBtn.textContent = "Tandai sudah dicek";
    }
    return;
  }

  const deleteBtn = e.target.closest(".schedule-delete-btn");
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const row = deleteBtn.closest(".schedule-row");
    const name = row?.querySelector(".schedule-name")?.textContent || id;

    const sure = confirm(
      `Yakin mau hapus "${name}"?\n\nHalaman /${id} bakal langsung ilang dari database. Kalau halamannya masih ke-cache di edge Cloudflare, bisa aja masih kebuka sampai cache-nya abis sendiri.\n\nAksi ini nggak bisa dibatalin.`
    );
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
        deleteBtn.textContent = "Hapus";
      }
    } catch {
      showToast("Nggak bisa konek ke server.");
      deleteBtn.disabled = false;
      deleteBtn.textContent = "Hapus";
    }
  }
});
