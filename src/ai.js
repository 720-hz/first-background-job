// The slow operation. The assignment's own Stage 2 text calls step.sleep
// a "stand-in for a real slow task (an AI call, a big export)" — this
// project uses the real thing instead of the stand-in: make-report's
// first step actually calls an LLM to write the report.
//
// Same stub/real toggle used in this session's other AI-backed project
// (ai-decision-flow): works with zero setup (LLM_STUB=1, the default),
// upgrades to a real OpenAI call the moment a key is set. Stub mode still
// takes a few realistic seconds so the "pending" status is actually
// observable when you poll — an instant fake would defeat the point of
// the assignment.
const OpenAI = require("openai");

function isStubMode() {
  if (process.env.LLM_STUB === "0") return false;
  if (process.env.LLM_STUB === "1") return true;
  return !process.env.OPENAI_API_KEY; // no key -> stub by default
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const STUB_ANGLES = [
  "demand has been steady with a small uptick over the last few days",
  "engagement is concentrated in a handful of repeat customers",
  "the numbers are unremarkable this period — nothing needs attention",
  "a short seasonal dip is visible but within the normal range",
  "growth is modest but consistent week over week",
];

async function stubGenerateReport(topic) {
  // 3-6s simulated latency — long enough that a client polling GET
  // /reports/:id genuinely sees "pending" before "done", same as a real
  // model call would produce.
  await sleep(3000 + Math.floor(Math.random() * 3000));
  const angle = STUB_ANGLES[Math.floor(Math.random() * STUB_ANGLES.length)];
  return `Report on "${topic}": ${angle}. (stub mode — set OPENAI_API_KEY and LLM_STUB=0 for a real model call)`;
}

let client = null;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      timeout: Number(process.env.LLM_TIMEOUT_MS) || 20000,
    });
  }
  return client;
}

async function realGenerateReport(topic) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await getClient().chat.completions.create({
    model,
    temperature: 0.6,
    max_tokens: 180,
    messages: [
      {
        role: "system",
        content:
          "You write short, plain-language status reports for a small shop's internal dashboard. Two to three sentences, no headers, no bullet points, no markdown.",
      },
      { role: "user", content: `Write a short status report about: ${topic}` },
    ],
  });
  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Model returned an empty report.");
  return text;
}

/** The slow operation make-report's first step calls. */
async function generateReport(topic) {
  return isStubMode() ? stubGenerateReport(topic) : realGenerateReport(topic);
}

module.exports = { generateReport, isStubMode };
