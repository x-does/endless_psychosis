require("dotenv").config({ path: require("node:path").join(__dirname, ".env"), quiet: true });
const { createApp, prepare } = require("./dist-server/app.cjs");

const app = createApp();
const ready = prepare().catch((error) => {
  console.error("[endless] startup preparation failed", error);
});

const isMain = require.main === module;

if (isMain) {
  ready.then(() => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, "0.0.0.0", () => {
      console.log(`[endless] listening on http://0.0.0.0:${port}`);
    });
  });
}

module.exports = app;
