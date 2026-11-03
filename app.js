const path = require("node:path");
const fs = require("node:fs");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const gateway = require("express")();
gateway.enable("strict routing");
gateway.disable("x-powered-by");

let production = null;
let productionFailure = null;

function loadApplication(bundle, options) {
  return require(bundle).createApp(options);
}
// Keep diagnostics available even if a bundle or staging manifest cannot load.
gateway.get("/health/ready", (_req, res) => {
  res.set("Cache-Control", "no-store").status(production ? 200 : 503).json({
    status: production ? "ok" : "unavailable",
    production: production ? "loaded" : productionFailure,
  });
});

try {
  production = loadApplication("./dist-server/app.cjs");
  console.log("[endless] production application loaded");
} catch (error) {
  productionFailure = "application_load_failed";
  console.error("[endless] production application failed to load", error.code || error.name);
}

gateway.use("/dev", (_req, res) => res.redirect(302, "/"));
gateway.use((req, res, next) => production
  ? production(req, res, next)
  : res.status(503).json({ error: productionFailure }));

// Listening must not wait for MySQL. Each app gates only its database routes.
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  gateway.listen(port, "0.0.0.0", () => console.log(`[endless] listening on port ${port}`));
}
module.exports = gateway;
