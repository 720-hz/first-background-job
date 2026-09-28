// Stage 1 — the introductions. Not part of the real product; just proves
// the wiring (client -> function -> serve -> Dev Server) works before
// anything depends on it.
const { inngest } = require("../client");

const sayHello = inngest.createFunction(
  { id: "say-hello", triggers: [{ event: "test/hello" }] },
  async ({ step }) => {
    await step.sleep("pretend-to-work", "5s");
    return "Hello from the background!";
  }
);

module.exports = { sayHello };
