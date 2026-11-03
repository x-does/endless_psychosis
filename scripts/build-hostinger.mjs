import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

// One main release at the root URL. Ignore legacy BUILD_STAGING settings.
rmSync("dist-dev", { recursive: true, force: true });
rmSync(".staging-build", { recursive: true, force: true });
execFileSync("npm", ["run", "build:app"], {
  stdio: "inherit",
  env: { ...process.env, APP_BASE_PATH: "/", VITE_SATIRE: "1" },
});
