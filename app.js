// === DOM refs ===
const $ = (id) => document.getElementById(id);
const uploadSection  = $("uploadSection");
const uploadZone     = $("uploadZone");
const fileInput      = $("fileInput");
const previewSection = $("previewSection");
const originalImg    = $("originalPreview");
const resultImg      = $("resultPreview");
const resultBody     = $("resultBody");
const resultPlaceholder = $("resultPlaceholder");
const resultContainer   = $("resultContainer");
const processBtn     = $("processBtn");
const changeBtn      = $("changeBtn");
const resetBtn       = $("resetBtn");
const downloadBtn    = $("downloadBtn");
const loadingOverlay = $("loadingOverlay");
const errorToast     = $("errorToast");
const errorMessage   = $("errorMessage");
const errorClose     = $("errorClose");
const bgSwatches     = $("bgSwatches");
const colorPicker    = $("colorPicker");
const customSwatch   = $("customBg");
const resultControls = $("resultControls");

// === State ===
let currentFile   = null;
let resultBlob    = null;
let currentBg     = "checker";
let isProcessing  = false;

// === Upload: click & drag ===
uploadZone.addEventListener("click", () => fileInput.click());

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("drag-over");
});
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please select an image file (JPG, PNG, or WebP).");
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    showError("Image too large. Maximum size is 25 MB.");
    return;
  }
  currentFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    originalImg.src = e.target.result;
    showPreview();
  };
  reader.readAsDataURL(file);
}

// === View transitions ===
function showPreview() {
  uploadSection.classList.add("hidden");
  previewSection.classList.remove("hidden");
  resultImg.classList.add("hidden");
  resultPlaceholder.classList.remove("hidden");
  resultControls.classList.add("hidden");
  processBtn.disabled = false;
  resultBlob = null;
  resetBgSwatches();
}

function showUpload() {
  previewSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  currentFile = null;
  resultBlob = null;
  isProcessing = false;
  fileInput.value = "";
}

// === Background removal ===
processBtn.addEventListener("click", removeBackground);

async function removeBackground() {
  if (isProcessing || !currentFile) return;

  isProcessing = true;
  processBtn.disabled = true;
  loadingOverlay.classList.remove("hidden");
  errorToast.classList.add("hidden");

  try {
    const formData = new FormData();
    formData.append("image", currentFile);

    const res = await fetch("/api/remove-bg", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.detail || err.error || "Failed to remove background");
    }

    resultBlob = await res.blob();
    const url = URL.createObjectURL(resultBlob);
    resultImg.src = url;
    resultImg.classList.remove("hidden");
    resultPlaceholder.classList.add("hidden");
    resultControls.classList.remove("hidden");

    resultImg.onload = () => URL.revokeObjectURL(url);
  } catch (err) {
    showError(err.message || "An unexpected error occurred.");
    resultImg.classList.add("hidden");
    resultPlaceholder.classList.remove("hidden");
    resultPlaceholder.innerHTML = `
      <i data-lucide="circle-alert" size="32"></i>
      <p style="color:var(--danger)">Processing failed</p>
    `;
    lucide.createIcons();
  } finally {
    isProcessing = false;
    processBtn.disabled = false;
    loadingOverlay.classList.add("hidden");
    lucide.createIcons();
  }
}

// === Download ===
downloadBtn.addEventListener("click", () => {
  if (!resultBlob) return;

  const bg = currentBg;
  if (bg === "checker") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultBlob);
    a.download = "removed-background.png";
    a.click();
    URL.revokeObjectURL(a.href);
  } else {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "removed-background.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = URL.createObjectURL(resultBlob);
  }
});

// === Background color swatches ===
bgSwatches.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch");
  if (!swatch || swatch === customSwatch) return;

  const color = swatch.dataset.color;
  setBgColor(color, swatch);
});

customSwatch.addEventListener("click", () => colorPicker.click());
colorPicker.addEventListener("input", (e) => {
  setBgColor(e.target.value);
});

function setBgColor(color, swatchEl) {
  currentBg = color;

  document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
  if (swatchEl) {
    swatchEl.classList.add("active");
  } else {
    const match = document.querySelector(`.swatch[data-color="${color}"]`);
    if (match) match.classList.add("active");
    else customSwatch.classList.add("active");
  }

  if (color === "checker") {
    resultContainer.style.background = "";
    resultContainer.style.backgroundImage = "";
    resultContainer.classList.add("checkerboard");
  } else {
    resultContainer.classList.remove("checkerboard");
    resultContainer.style.background = color;
    resultContainer.style.backgroundImage = "none";
  }
}

function resetBgSwatches() {
  currentBg = "checker";
  document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
  document.querySelector(".swatch:first-child")?.classList.add("active");
  resultContainer.style.background = "";
  resultContainer.classList.add("checkerboard");
}

// === Change / Reset ===
changeBtn.addEventListener("click", () => fileInput.click());
resetBtn.addEventListener("click", showUpload);

// === Error handling ===
errorClose.addEventListener("click", () => errorToast.classList.add("hidden"));

function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.classList.remove("hidden");
}

// === Keyboard shortcuts ===
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    errorToast.classList.add("hidden");
    loadingOverlay.classList.add("hidden");
  }
  if (e.key === "o" && (e.metaKey || e.ctrlKey) && !isProcessing) {
    e.preventDefault();
    fileInput.click();
  }
});
