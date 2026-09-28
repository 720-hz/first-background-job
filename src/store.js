// In-memory report store — the same simplification as A1/A2 and the PDF
// report generator assignment: a plain Map, gone on restart, no database.
// It works here specifically because the Inngest SDK runs the background
// functions inside this same Node process (served at /api/inngest) rather
// than in a separate worker process — a real deployment would put this in
// a shared store (Postgres, Redis) that both the API and a separate
// worker process can reach.
const reports = new Map();

function createReport({ id, topic }) {
  const report = { id, topic, status: "pending", result: null, createdAt: new Date().toISOString() };
  reports.set(id, report);
  return report;
}

function getReport(id) {
  return reports.get(id) ?? null;
}

function markDone(id, result) {
  const report = reports.get(id);
  if (!report) return null;
  report.status = "done";
  report.result = result;
  report.finishedAt = new Date().toISOString();
  return report;
}

function markFailed(id, errorMessage) {
  const report = reports.get(id);
  if (!report) return null;
  report.status = "failed";
  report.error = errorMessage;
  report.finishedAt = new Date().toISOString();
  return report;
}

function listReports() {
  return Array.from(reports.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Counts by status, for the heartbeat cron's summary line. */
function counts() {
  const c = { pending: 0, done: 0, failed: 0 };
  for (const r of reports.values()) {
    if (c[r.status] !== undefined) c[r.status]++;
  }
  return c;
}

module.exports = { createReport, getReport, markDone, markFailed, listReports, counts };
