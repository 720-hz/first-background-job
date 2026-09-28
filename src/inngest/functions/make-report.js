// Stage 2 — the actual product. Accepts the report/requested event (sent
// by POST /reports, which already returned 202 before this function even
// started), does the one slow thing — a real AI call — then builds and
// stores the result.
//
// Two steps, on purpose: step.run("generate-report-content", ...) is the
// slow operation (the AI call — this project's real-thing substitute for
// the assignment's step.sleep stand-in), step.run("build-report", ...) is
// the cheap bookkeeping step that turns that content into a stored report.
const { inngest } = require("../client");
const { generateReport } = require("../../ai");
const store = require("../../store");

const makeReport = inngest.createFunction(
  { id: "make-report", triggers: [{ event: "report/requested" }] },
  async ({ event, step }) => {
    const { id, topic } = event.data;

    const content = await step.run("generate-report-content", () => generateReport(topic));

    const result = await step.run("build-report", async () => {
      const report = {
        topic,
        content,
        wordCount: content.trim().split(/\s+/).length,
      };
      store.markDone(id, report);
      return report;
    });

    return result;
  }
);

module.exports = { makeReport };
