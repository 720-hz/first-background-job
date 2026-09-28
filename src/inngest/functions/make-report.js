// Stages 2 & 3 — the actual product. Accepts the report/requested event
// (sent by POST /reports, which already returned 202 before this function
// even started), does the one slow thing — a real AI call — then builds
// and stores the result.
//
// Two steps, on purpose: step.run("generate-report-content", ...) is the
// slow operation (the AI call — this project's real-thing substitute for
// the assignment's step.sleep stand-in), step.run("build-report", ...) is
// the cheap bookkeeping step that turns that content into a stored report.
// Steps are memoized — if build-report throws and Inngest retries the
// whole function, the AI call from step one is NOT repeated. That's the
// actual point of splitting them: a retry re-pays only for the step that
// failed, not for the expensive one that already succeeded.
const { inngest } = require("../client");
const { generateReport } = require("../../ai");
const store = require("../../store");

const makeReport = inngest.createFunction(
  {
    id: "make-report",
    triggers: [{ event: "report/requested" }],
    retries: 2, // 1 initial attempt + 2 retries = 3 total, per the assignment's checkpoint
    onFailure: async ({ event, step }) => {
      // The assignment's third non-negotiable, alongside idempotency and
      // retries: "someone must find out." A real system would page
      // on-call or post to Slack here; this logs a clearly-marked alert
      // line and records the failure on the report so GET /reports/:id
      // reports it too.
      const original = event.data.event;
      const { id, topic } = original.data;
      const message = event.data.error?.message ?? "Unknown error";
      await step.run("mark-failed-and-alert", async () => {
        store.markFailed(id, message);
        console.error(`[ALERT] make-report permanently failed for report ${id} (topic "${topic}"): ${message}`);
      });
    },
  },
  async ({ event, step }) => {
    const { id, topic } = event.data;

    const content = await step.run("generate-report-content", () => generateReport(topic));

    const result = await step.run("build-report", async () => {
      // Deliberately placed here rather than before the AI call: this is
      // Stage 3's fail-path switch, and putting it in the second step
      // means a retry never re-runs (or re-pays for) the AI call above.
      if (topic === "fail") {
        throw new Error("The report oven is broken!");
      }
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
