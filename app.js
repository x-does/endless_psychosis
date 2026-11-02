require("dotenv").config({ path: require("node:path").join(__dirname, ".env"), quiet: true });
const { createApp, prepare } = require("./dist-server/app.cjs");

const app = createApp();
const fs = require("node:fs");
const path = require("node:path");
// Mount staging before the production SPA fallback by exporting an outer app.
const gateway = require("express")();
gateway.enable("strict routing");
if (fs.existsSync(path.join(__dirname, "dist-dev/server/app.cjs"))) {
  const staging = require("./dist-dev/server/app.cjs");
  const release = JSON.parse(fs.readFileSync(path.join(__dirname, "dist-dev/release.json"), "utf8"));
  gateway.get("/dev", (_req, res) => res.redirect(302, "/dev/"));
  gateway.use("/dev", staging.createApp({ staging: true, dist: path.join(__dirname, "dist-dev"), commit: release.commit }));
} else {
  gateway.use("/dev", (_req, res) => res.status(503).json({ error: "staging_not_built" }));
}
gateway.use(app);
const ready = prepare().catch((error) => {
  console.error("[endless] startup preparation failed", error);
});

const isMain = require.main === module;

if (isMain) {
  ready.then(() => {
    const port = Number(process.env.PORT || 3000);
    gateway.listen(port, "0.0.0.0", () => {
      console.log(`[endless] listening on http://0.0.0.0:${port}`);
    });
  });
}

module.exports = gateway;
