require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use llama-3.3-70b — best for structured SVG code generation
const MODEL = "llama-3.3-70b-versatile";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Helper: clean SVG from model output ─────────────────────────────────────
function extractSVG(text) {
  // Strip markdown code blocks if model wraps it
  const match = text.match(/<svg[\s\S]*<\/svg>/i);
  return match ? match[0] : null;
}

// ── Generate single icon ─────────────────────────────────────────────────────
app.post("/api/generate-icon", async (req, res) => {
  const { prompt, style, color } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are an expert SVG icon designer. You ONLY output raw SVG code — no explanations, no markdown, no backticks, no preamble. Just the raw SVG element starting with <svg and ending with </svg>.`,
        },
        {
          role: "user",
          content: `Create a beautiful, professional SVG icon for: "${prompt}"

Requirements:
- Style: ${style || "modern flat"}
- Primary color: ${color || "#6366f1"}
- viewBox="0 0 100 100" width="100" height="100"
- Clean, minimal, recognizable at small sizes
- Use the primary color as main color, add lighter/darker shades for depth
- Include a <title> tag describing the icon
- Pure SVG shapes only (no external resources, no fonts)
- Output ONLY the raw SVG code, nothing else`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const svg = extractSVG(raw);

    if (!svg) {
      console.error("Raw output:", raw);
      return res.status(500).json({ error: "Model did not return valid SVG" });
    }

    res.json({ svg, prompt, style, color });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "Failed to generate icon", detail: err.message });
  }
});

// ── Generate 4 variations ────────────────────────────────────────────────────
app.post("/api/generate-variations", async (req, res) => {
  const { prompt, count = 4 } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const styles = ["modern flat", "outlined", "filled bold", "minimal line"];
  const colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b"];

  try {
    const promises = Array.from({ length: count }, (_, i) =>
      groq.chat.completions.create({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `You are an expert SVG icon designer. Output ONLY raw SVG code. No markdown, no explanations, no backticks. Start directly with <svg and end with </svg>.`,
          },
          {
            role: "user",
            content: `Create a ${styles[i]} style SVG icon for: "${prompt}"
Primary color: ${colors[i]}
viewBox="0 0 100 100" width="100" height="100"
Pure SVG shapes only. Output raw SVG only.`,
          },
        ],
      })
    );

    const results = await Promise.all(promises);

    const variations = results.map((r, i) => {
      const raw = r.choices[0]?.message?.content || "";
      const svg = extractSVG(raw);
      return { svg: svg || "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><circle cx='50' cy='50' r='40' fill='#6366f1'/></svg>", style: styles[i], color: colors[i] };
    });

    res.json({ variations });
  } catch (err) {
    console.error("Groq variation error:", err);
    res.status(500).json({ error: "Failed to generate variations", detail: err.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", model: MODEL }));

// ── Catch-all ────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} | Model: ${MODEL}`));
