const API_BASE = window.location.origin;

// ── Elements ────────────────────────────────────────────────────────────────
const promptEl = document.getElementById("prompt");
const charCount = document.getElementById("charCount");
const styleEl = document.getElementById("style");
const colorEl = document.getElementById("color");
const generateBtn = document.getElementById("generateBtn");
const btnText = document.getElementById("btnText");
const resultArea = document.getElementById("resultArea");
const iconDisplay = document.getElementById("iconDisplay");
const variationsBtn = document.getElementById("variationsBtn");
const variationsGrid = document.getElementById("variationsGrid");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const toast = document.getElementById("toast");

let currentSvg = null;

// ── Char counter ─────────────────────────────────────────────────────────────
promptEl.addEventListener("input", () => {
  charCount.textContent = `${promptEl.value.length}/200`;
});

// ── Color presets ─────────────────────────────────────────────────────────────
document.querySelectorAll(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    colorEl.value = btn.dataset.color;
    document.querySelectorAll(".preset").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ── Loading ───────────────────────────────────────────────────────────────────
function setLoading(active, msg = "Generating your icon...") {
  loadingText.textContent = msg;
  loadingOverlay.classList.toggle("active", active);
}

// ── Generate ──────────────────────────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { showToast("Please enter a prompt", "error"); return; }

  setLoading(true, "Claude is crafting your icon...");
  generateBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/generate-icon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, style: styleEl.value, color: colorEl.value }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Generation failed");

    currentSvg = data.svg;
    displayIcon(data.svg);
    variationsBtn.disabled = false;
    showToast("Icon generated! ✦");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
    generateBtn.disabled = false;
  }
});

// ── Display icon ──────────────────────────────────────────────────────────────
function displayIcon(svg) {
  iconDisplay.innerHTML = svg;
  resultArea.style.display = "block";
  resultArea.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Size previews
  const sizes = [16, 32, 64, 128];
  sizes.forEach((s) => {
    const el = document.getElementById(`prev${s}`);
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.innerHTML = svg;
  });
}

// ── Download SVG ──────────────────────────────────────────────────────────────
document.getElementById("downloadSvg").addEventListener("click", () => {
  if (!currentSvg) return;
  const blob = new Blob([currentSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "icon.svg"; a.click();
  URL.revokeObjectURL(url);
  showToast("SVG downloaded!");
});

// ── Download PNG ──────────────────────────────────────────────────────────────
document.getElementById("downloadPng").addEventListener("click", async () => {
  if (!currentSvg) return;
  const img = new Image();
  const blob = new Blob([currentSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 512, 512);
    canvas.toBlob((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "icon.png"; a.click();
      showToast("PNG downloaded!");
    });
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

// ── Copy SVG code ─────────────────────────────────────────────────────────────
document.getElementById("copyCode").addEventListener("click", () => {
  if (!currentSvg) return;
  navigator.clipboard.writeText(currentSvg).then(() => showToast("SVG code copied!"));
});

// ── Variations ────────────────────────────────────────────────────────────────
variationsBtn.addEventListener("click", async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { showToast("Enter a prompt first", "error"); return; }

  setLoading(true, "Generating 4 style variations...");
  variationsBtn.disabled = true;
  variationsGrid.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/generate-variations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, count: 4 }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Variation failed");

    data.variations.forEach((v, i) => {
      const card = document.createElement("div");
      card.className = "variation-card";
      card.innerHTML = `
        <div class="variation-icon">${v.svg}</div>
        <span class="variation-style">${v.style}</span>
        <button class="variation-dl" data-index="${i}">↓ Download SVG</button>
      `;
      variationsGrid.appendChild(card);
    });

    // Download handlers
    document.querySelectorAll(".variation-dl").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const svg = data.variations[i].svg;
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `icon-variation-${i + 1}.svg`;
        a.click();
        showToast("Variation downloaded!");
      });
    });

    document.getElementById("variations").scrollIntoView({ behavior: "smooth" });
    showToast("4 variations ready! ◈");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
    variationsBtn.disabled = false;
  }
});

// ── Enter key ─────────────────────────────────────────────────────────────────
promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateBtn.click();
});
