import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
execFileSync("npm", ["run", "build:app"], { stdio: "inherit", env: { ...process.env, VITE_SATIRE: "0" } });
if (process.env.BUILD_STAGING !== "1") process.exit(0);
const response = await fetch("https://api.github.com/repos/x-does/endless_psychosis/commits/dev");
if (!response.ok) throw new Error(`Cannot resolve dev branch: ${response.status}`);
const { sha } = await response.json();
const archive = await fetch(`https://api.github.com/repos/x-does/endless_psychosis/tarball/${sha}`);
if (!archive.ok) throw new Error(`Cannot download dev source: ${archive.status}`);
const work = path.join(root, ".staging-build");
rmSync(work, { recursive: true, force: true });
mkdirSync(work);
try {
  writeFileSync(path.join(work, "source.tar.gz"), Buffer.from(await archive.arrayBuffer()));
  execFileSync("tar", ["-xzf", "source.tar.gz", "--strip-components=1"], { cwd: work });
  execFileSync("npm", ["ci", "--include=dev", "--ignore-scripts"], { cwd: work, stdio: "inherit" });
  execFileSync("npm", ["run", "build:app"], { cwd: work, stdio: "inherit", env: { ...process.env, APP_BASE_PATH: "/dev/", VITE_SATIRE: "1" } });
  const { cpSync } = await import("node:fs");
  rmSync(path.join(root, "dist-dev"), { recursive: true, force: true });
  cpSync(path.join(work, "dist"), path.join(root, "dist-dev"), { recursive: true });
  mkdirSync(path.join(root, "dist-dev/server"));
  cpSync(path.join(work, "dist-server/app.cjs"), path.join(root, "dist-dev/server/app.cjs"));
  writeFileSync(path.join(root, "dist-dev/release.json"), JSON.stringify({ commit: sha }));
  console.log(`Built isolated /dev release ${sha}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
