// The Inngest client is the one shared object every function and every
// event-send call goes through. One client per app, id matches the app.
const { Inngest } = require("inngest");

const inngest = new Inngest({ id: "report-api" });

module.exports = { inngest };
