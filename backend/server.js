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

// ── Pre-built clean SVG templates ────────────────────────────────────────────
const ICON_LIBRARY = {
  heart: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Heart</title>
    <path d="M50 80 C50 80 15 55 15 32 C15 20 25 12 35 12 C42 12 48 16 50 20 C52 16 58 12 65 12 C75 12 85 20 85 32 C85 55 50 80 50 80Z" fill="${c}"/>
    <path d="M50 75 C50 75 20 52 20 33 C20 23 28 17 36 17 C42 17 47 20 50 25" fill="${c}" opacity="0.4"/>
  </svg>`,

  star: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Star</title>
    <polygon points="50,10 61,35 90,35 67,57 76,85 50,68 24,85 33,57 10,35 39,35" fill="${c}"/>
    <polygon points="50,20 58,38 78,38 62,52 68,72 50,60 32,72 38,52 22,38 42,38" fill="${c}" opacity="0.35"/>
  </svg>`,

  wifi: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>WiFi</title>
    <circle cx="50" cy="72" r="5" fill="${c}"/>
    <path d="M32 55 Q50 42 68 55" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="M20 42 Q50 22 80 42" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M10 30 Q50 5 90 30" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`,

  bell: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Bell</title>
    <path d="M50 15 C35 15 25 27 25 42 L25 65 L15 72 L85 72 L75 65 L75 42 C75 27 65 15 50 15Z" fill="${c}"/>
    <rect x="42" y="72" width="16" height="8" rx="4" fill="${c}" opacity="0.7"/>
    <ellipse cx="50" cy="20" rx="8" ry="6" fill="${c}" opacity="0.3"/>
    <circle cx="38" cy="38" r="5" fill="white" opacity="0.15"/>
  </svg>`,

  home: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Home</title>
    <polygon points="50,15 85,48 78,48 78,85 22,85 22,48 15,48" fill="${c}"/>
    <rect x="38" y="60" width="24" height="25" rx="3" fill="${c}" opacity="0.4"/>
    <rect x="55" y="38" width="14" height="14" rx="2" fill="white" opacity="0.2"/>
    <polygon points="50,18 82,48 18,48" fill="${c}" opacity="0.3"/>
  </svg>`,

  search: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Search</title>
    <circle cx="42" cy="42" r="24" stroke="${c}" stroke-width="7" fill="none"/>
    <circle cx="42" cy="42" r="24" fill="${c}" opacity="0.1"/>
    <line x1="60" y1="60" x2="82" y2="82" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="36" cy="36" r="8" fill="${c}" opacity="0.2"/>
  </svg>`,

  rocket: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Rocket</title>
    <ellipse cx="50" cy="40" rx="16" ry="30" fill="${c}"/>
    <path d="M34 55 L20 75 L38 68Z" fill="${c}" opacity="0.7"/>
    <path d="M66 55 L80 75 L62 68Z" fill="${c}" opacity="0.7"/>
    <ellipse cx="50" cy="42" rx="7" ry="10" fill="white" opacity="0.25"/>
    <circle cx="50" cy="40" r="6" fill="white" opacity="0.3"/>
    <ellipse cx="50" cy="72" rx="8" ry="5" fill="#ff6b35" opacity="0.9"/>
    <ellipse cx="50" cy="76" rx="5" ry="4" fill="#ffd700" opacity="0.8"/>
  </svg>`,

  shield: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Shield</title>
    <path d="M50 10 L82 25 L82 52 C82 68 67 82 50 88 C33 82 18 68 18 52 L18 25 Z" fill="${c}"/>
    <path d="M50 18 L75 30 L75 52 C75 64 63 75 50 80" fill="${c}" opacity="0.3"/>
    <polyline points="35,50 46,62 66,40" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  lightning: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Lightning Bolt</title>
    <polygon points="58,10 28,55 48,55 42,90 72,45 52,45" fill="${c}"/>
    <polygon points="56,14 32,52 50,52 44,82 68,48 50,48" fill="${c}" opacity="0.35"/>
  </svg>`,

  user: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>User</title>
    <circle cx="50" cy="35" r="20" fill="${c}"/>
    <ellipse cx="50" cy="35" rx="10" ry="12" fill="${c}" opacity="0.3"/>
    <path d="M15 85 C15 65 85 65 85 85" fill="${c}" opacity="0.85"/>
    <path d="M22 85 C22 68 78 68 78 85" fill="${c}" opacity="0.3"/>
  </svg>`,

  camera: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Camera</title>
    <rect x="10" y="35" width="80" height="52" rx="8" fill="${c}"/>
    <path d="M35 35 L42 20 L58 20 L65 35Z" fill="${c}" opacity="0.8"/>
    <circle cx="50" cy="62" r="16" fill="${c}" opacity="0.25" stroke="white" stroke-width="3"/>
    <circle cx="50" cy="62" r="9" fill="${c}" opacity="0.5"/>
    <circle cx="50" cy="62" r="4" fill="white" opacity="0.4"/>
    <circle cx="30" cy="47" r="4" fill="white" opacity="0.3"/>
  </svg>`,

  leaf: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Leaf</title>
    <path d="M50 85 C50 85 15 65 15 35 C15 15 35 10 50 15 C65 10 85 15 85 35 C85 65 50 85 50 85Z" fill="${c}"/>
    <line x1="50" y1="85" x2="50" y2="25" stroke="white" stroke-width="2.5" opacity="0.4"/>
    <line x1="50" y1="50" x2="30" y2="38" stroke="white" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="60" x2="70" y2="48" stroke="white" stroke-width="1.5" opacity="0.3"/>
    <ellipse cx="40" cy="32" rx="8" ry="5" fill="white" opacity="0.15" transform="rotate(-20,40,32)"/>
  </svg>`,

  music: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Music Note</title>
    <path d="M40 70 L40 30 L75 22 L75 55" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <line x1="40" y1="30" x2="75" y2="22" stroke="${c}" stroke-width="5"/>
    <circle cx="33" cy="72" r="10" fill="${c}"/>
    <circle cx="68" cy="57" r="10" fill="${c}"/>
    <circle cx="33" cy="72" r="5" fill="${c}" opacity="0.4"/>
    <circle cx="68" cy="57" r="5" fill="${c}" opacity="0.4"/>
  </svg>`,

  cloud: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Cloud</title>
    <circle cx="35" cy="55" r="20" fill="${c}"/>
    <circle cx="60" cy="50" r="24" fill="${c}"/>
    <circle cx="75" cy="58" r="15" fill="${c}"/>
    <rect x="15" y="58" width="70" height="20" fill="${c}"/>
    <circle cx="45" cy="45" r="12" fill="${c}" opacity="0.3"/>
  </svg>`,

  settings: (c) => `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <title>Settings Gear</title>
    <circle cx="50" cy="50" r="14" fill="${c}"/>
    <circle cx="50" cy="50" r="8" fill="${c}" opacity="0.4"/>
    <path d="M50 15 L55 25 L65 20 L65 32 L75 32 L70 42 L80 50 L70 58 L75 68 L65 68 L65 80 L55 75 L50 85 L45 75 L35 80 L35 68 L25 68 L30 58 L20 50 L30 42 L25 32 L35 32 L35 20 L45 25 Z" fill="${c}" opacity="0.75"/>
  </svg>`,
};

// ── Match prompt to icon ──────────────────────────────────────────────────────
async function matchIcon(prompt) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 50,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You map icon descriptions to the closest keyword. Reply with ONLY one word from this list, nothing else:
heart, star, wifi, bell, home, search, rocket, shield, lightning, user, camera, leaf, music, cloud, settings`,
      },
      {
        role: "user",
        content: `Icon description: "${prompt}". Pick the single closest keyword from the list.`,
      },
    ],
  });

  const key = completion.choices[0]?.message?.content?.trim().toLowerCase().replace(/[^a-z]/g, "");
  return ICON_LIBRARY[key] ? key : null;
}

// ── Generate single icon ──────────────────────────────────────────────────────
app.post("/api/generate-icon", async (req, res) => {
  const { prompt, style, color } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const key = await matchIcon(prompt);

    if (key) {
      // Use clean template
      const svg = ICON_LIBRARY[key](color || "#6366f1");
      return res.json({ svg, prompt, style, color, matched: key });
    }

    // Fallback: ask model to generate with strict guidance
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are an SVG icon generator. Output ONLY raw SVG. No markdown. No explanation. Start with <svg, end with </svg>.
Rules:
- viewBox="0 0 100 100" width="100" height="100"  
- Use ONLY: rect, circle, ellipse, polygon, polyline, path, line elements
- Keep shapes simple and geometric
- Use provided color as fill, add opacity variants for depth
- NO text, NO image, NO foreignObject`,
        },
        {
          role: "user",
          content: `Draw a clean icon for: "${prompt}". Primary color: ${color || "#6366f1"}. Style: ${style || "modern flat"}. Simple geometric shapes only.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const match = raw.match(/<svg[\s\S]*<\/svg>/i);
    const svg = match ? match[0] : ICON_LIBRARY["star"](color || "#6366f1");

    res.json({ svg, prompt, style, color });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to generate icon", detail: err.message });
  }
});

// ── Generate 4 variations ─────────────────────────────────────────────────────
app.post("/api/generate-variations", async (req, res) => {
  const { prompt, count = 4 } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const styles = ["modern flat", "outlined", "filled bold", "minimal line"];
  const colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b"];

  try {
    const key = await matchIcon(prompt);

    if (key) {
      // Return same icon in 4 colors with style labels
      const variations = colors.slice(0, count).map((c, i) => ({
        svg: ICON_LIBRARY[key](c),
        style: styles[i],
        color: c,
      }));
      return res.json({ variations });
    }

    // Fallback for unknown icons
    const fallbackColors = colors.slice(0, count);
    const variations = fallbackColors.map((c, i) => ({
      svg: ICON_LIBRARY["star"](c),
      style: styles[i],
      color: c,
    }));
    res.json({ variations });
  } catch (err) {
    console.error("Variation error:", err);
    res.status(500).json({ error: "Failed", detail: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
