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

// ── Core SVG generation prompt ────────────────────────────────────────────────
function buildPrompt(prompt, color, style) {
  return `You are an expert SVG icon coder. Your job is to write clean, accurate SVG code.

ICON REQUEST: "${prompt}"
COLOR: ${color}
STYLE: ${style}

MANDATORY SVG RULES:
1. Output ONLY the raw SVG element. No markdown, no explanation, no code fences.
2. Must start exactly with: <svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
3. Must end with: </svg>
4. Use ONLY these elements: <circle> <rect> <ellipse> <polygon> <polyline> <path> <line> <g>
5. NO text, NO image, NO foreignObject, NO defs with complex filters
6. Primary fill color: ${color} — use it on main shapes
7. Add depth: use opacity="0.3" or opacity="0.6" on secondary shapes
8. White highlights: use fill="white" opacity="0.2" for shine effects

DRAWING INSTRUCTIONS BY CONCEPT:
- Animals: use overlapping ellipses/circles for body parts, small circles for eyes
- Faces/Emoji: large circle base, smaller circles for eyes, arc path for mouth
- Buildings: rectangles for walls, polygon for roof, small rects for windows/doors  
- Vehicles: rounded rect for body, circles for wheels, rect for windows
- Nature (tree): triangle/polygon for leaves, rect for trunk
- Nature (sun): circle center + lines radiating outward using <line> elements
- Nature (moon): two overlapping circles (one filled bg color) to create crescent
- Food: use circles, rounded rects, and layered shapes
- Tech (phone): tall rounded rect, smaller rect for screen
- Tech (laptop): rect for screen, wider rect for keyboard base
- Sports (ball): circle with curved path lines on it
- Abstract/geometric: use polygon, circles, and rects creatively
- Arrows: polygon for arrowhead + rect for shaft
- Lock: rounded rect body + arc path for shackle
- Eye: large ellipse + circle pupil + smaller circle highlight
- Letter/Mail: rect with V-shape polyline on top
- Map pin/location: circle top + triangle bottom forming teardrop path
- Chart/Graph: vertical rects of different heights
- Clock: circle + two line hands
- Diamond: polygon with 4-5 points

IMPORTANT: Draw the concept accurately. A "cat" should look like a cat (oval body, triangle ears, whisker lines). A "pizza" should look like a pizza (circle, triangle slices, dots for toppings). Be creative and accurate.

Now output the SVG:`;
}

function extractSVG(text) {
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

// ── Generate single icon ──────────────────────────────────────────────────────
app.post("/api/generate-icon", async (req, res) => {
  const { prompt, style, color } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are an SVG icon generator. You output ONLY raw SVG code. You never write explanations, markdown, or anything outside the SVG tags. Every response is a single valid SVG element.`,
        },
        {
          role: "user",
          content: buildPrompt(prompt, color || "#6366f1", style || "modern flat"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const svg = extractSVG(raw);

    if (!svg) {
      console.error("No SVG found in output:", raw);
      return res.status(500).json({ error: "Model did not return valid SVG. Try rephrasing your prompt." });
    }

    res.json({ svg, prompt, style, color });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "Generation failed", detail: err.message });
  }
});

// ── Generate 4 variations ─────────────────────────────────────────────────────
app.post("/api/generate-variations", async (req, res) => {
  const { prompt, count = 4 } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const variations = [
    { style: "modern flat",   color: "#6366f1" },
    { style: "outlined",      color: "#ec4899" },
    { style: "filled bold",   color: "#10b981" },
    { style: "minimal line",  color: "#f59e0b" },
  ].slice(0, count);

  try {
    const promises = variations.map(({ style, color }) =>
      groq.chat.completions.create({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `You are an SVG icon generator. Output ONLY raw SVG code. No markdown, no explanation. Start with <svg and end with </svg>.`,
          },
          {
            role: "user",
            content: buildPrompt(prompt, color, style),
          },
        ],
      })
    );

    const results = await Promise.all(promises);

    const output = results.map((r, i) => {
      const raw = r.choices[0]?.message?.content?.trim() || "";
      const svg = extractSVG(raw);
      return {
        svg: svg || `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="${variations[i].color}"/></svg>`,
        style: variations[i].style,
        color: variations[i].color,
      };
    });

    res.json({ variations: output });
  } catch (err) {
    console.error("Variation error:", err);
    res.status(500).json({ error: "Failed to generate variations", detail: err.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", model: MODEL }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
