// Stage 4 — the clock, not a client, starts this one. No endpoint, no
// event: cron is the only trigger. Every minute (for testing — see the
// README for the "every day at 08:00" / "every Sunday at 22:00"
// equivalents), it logs one summary line of what the report store looks
// like right now.
const { inngest } = require("../client");
const store = require("../../store");

const heartbeat = inngest.createFunction(
  { id: "heartbeat", triggers: [{ cron: "* * * * *" }] }, // every minute — for testing; see README for real schedules
  async () => {
    const { pending, done, failed } = store.counts();
    console.log(`[heartbeat] pending=${pending} done=${done} failed=${failed}`);
    return { pending, done, failed };
  }
);

module.exports = { heartbeat };
