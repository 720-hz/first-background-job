require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env.local") });

const express = require("express");
const { randomUUID } = require("node:crypto");
const { serve } = require("inngest/express");
const { inngest } = require("./inngest/client");
const { sayHello } = require("./inngest/functions/say-hello");
const { makeReport } = require("./inngest/functions/make-report");
const { heartbeat } = require("./inngest/functions/heartbeat");
const store = require("./store");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Stage 0
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Stage 1/2/4 — Inngest mounts here; the Dev Server talks to this route.
app.use("/api/inngest", serve({ client: inngest, functions: [sayHello, makeReport, heartbeat] }));

// Stage 2 — the fast door. Makes an id, saves a pending report, sends the
// event, returns 202 immediately. No slow work happens in this handler.
app.post("/reports", async (req, res, next) => {
  try {
    const topic = req.body?.topic;
    // Stage 3: a missing topic is a wrong INPUT, not a wrong MOMENT — it's
    // rejected at the door with 400, and no event is ever sent. Retries
    // are for a job that failed after being accepted; this one never was.
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Body must include a non-empty string 'topic'." });
    }

    const id = randomUUID();
    store.createReport({ id, topic });
    await inngest.send({ name: "report/requested", data: { id, topic } });

    res.status(202).json({ id, status: "pending" });
  } catch (err) {
    next(err);
  }
});

// Stage 2 — the status endpoint. Polling this is how a client finds out
// "pending" became "done" (or Stage 3's "failed").
app.get("/reports/:id", (req, res) => {
  const report = store.getReport(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json(report);
});

// Extra: a list endpoint, the simplest of the optional "make it yours"
// additions — a control panel view over every report the store has.
app.get("/reports", (_req, res) => {
  res.json(store.listReports());
});

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`first-background-job listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
