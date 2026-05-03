require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Search Iconify for best matching icon ─────────────────────────────────────
async function searchIconify(query, limit = 8) {
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.icons || []; // e.g. ["mdi:pizza", "fluent:pizza-20-filled", ...]
}

// ── Fetch SVG from Iconify ────────────────────────────────────────────────────
async function fetchIconSVG(iconId) {
  // iconId format: "prefix:name" e.g. "mdi:pizza"
  const [prefix, name] = iconId.split(":");
  const url = `https://api.iconify.design/${prefix}/${name}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch icon: ${iconId}`);
  return await res.text();
}

// ── Colorize SVG: inject color into currentColor icons ────────────────────────
function colorizeSVG(svg, color) {
  return svg
    .replace(/width="[^"]*"/, 'width="100"')
    .replace(/height="[^"]*"/, 'height="100"')
    .replace(/currentColor/g, color)
    .replace(/<svg /, `<svg style="color:${color}" `);
}

// ── Use Groq to pick the best icon from search results ───────────────────────
async function pickBestIcon(prompt, icons) {
  if (icons.length === 0) return null;
  if (icons.length === 1) return icons[0];

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 30,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You pick the best icon ID from a list for a given description. Reply with ONLY the icon ID, nothing else. No explanation.`,
      },
      {
        role: "user",
        content: `Description: "${prompt}"
Available icons: ${icons.join(", ")}
Pick the single best matching icon ID:`,
      },
    ],
  });

  const picked = completion.choices[0]?.message?.content?.trim();
  // Validate it's actually in our list
  return icons.find((i) => i === picked) || icons[0];
}

// ── Generate single icon ──────────────────────────────────────────────────────
app.post("/api/generate-icon", async (req, res) => {
  const { prompt, style, color } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // 1. Search Iconify
    const icons = await searchIconify(prompt, 10);

    if (icons.length === 0) {
      return res.status(404).json({ error: `No icon found for "${prompt}". Try a simpler term like "pizza", "cat", "car".` });
    }

    // 2. Groq picks best match
    const bestIcon = await pickBestIcon(prompt, icons);

    // 3. Fetch SVG
    let svg = await fetchIconSVG(bestIcon);

    // 4. Apply color
    svg = colorizeSVG(svg, color || "#6366f1");

    res.json({ svg, prompt, style, color, iconId: bestIcon });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to generate icon", detail: err.message });
  }
});

// ── Generate 4 variations (same icon, 4 colors) ───────────────────────────────
app.post("/api/generate-variations", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const variationColors = [
    { color: "#6366f1", style: "Modern Flat" },
    { color: "#ec4899", style: "Outlined" },
    { color: "#10b981", style: "Filled Bold" },
    { color: "#f59e0b", style: "Minimal Line" },
  ];

  try {
    // Search once, reuse for all variations
    const icons = await searchIconify(prompt, 10);
    if (icons.length === 0) {
      return res.status(404).json({ error: `No icon found for "${prompt}".` });
    }

    // Pick 4 different icons from results for variety, or reuse best
    const bestIcon = await pickBestIcon(prompt, icons);

    // For variations, try to get different icon styles from results
    const selectedIcons = [
      icons[0] || bestIcon,
      icons[1] || bestIcon,
      icons[2] || bestIcon,
      icons[3] || bestIcon,
    ];

    const svgs = await Promise.all(
      selectedIcons.map((iconId) => fetchIconSVG(iconId).catch(() => fetchIconSVG(bestIcon)))
    );

    const variations = svgs.map((svg, i) => ({
      svg: colorizeSVG(svg, variationColors[i].color),
      style: variationColors[i].style,
      color: variationColors[i].color,
      iconId: selectedIcons[i],
    }));

    res.json({ variations });
  } catch (err) {
    console.error("Variation error:", err);
    res.status(500).json({ error: "Failed to generate variations", detail: err.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
