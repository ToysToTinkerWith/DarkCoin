const { onRequest } = require("firebase-functions/v2/https");
const next = require("next");

const isDev = process.env.NODE_ENV !== "production";

const app = next({
  dev: isDev,
  dir: __dirname,           // IMPORTANT: treat functions/ as the app root at runtime
  conf: { distDir: ".next" } // expects functions/.next
});

const handle = app.getRequestHandler();

// Prepare ONCE per warm instance
let prepared;

exports.nextServer = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    maxInstances: 10,
    secrets: ["ARENA_TICKET_SECRET"],
  },
  async (req, res) => {
    try {
      if (!prepared) prepared = app.prepare();
      await prepared;
      return handle(req, res);
    } catch (err) {
      console.error("Next SSR error:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);
