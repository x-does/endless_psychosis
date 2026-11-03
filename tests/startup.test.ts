import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import express from "express";

const realRequire = createRequire(import.meta.url);
async function check(options: { brokenStaging?: boolean; brokenProduction?: boolean }) {
  const source = readFileSync("app.js", "utf8");
  const module = { exports: {} };
  const loader = (id: string) => {
    if (id === "dotenv") return { config() {} };
    if (id === "node:fs") return { existsSync: () => true, readFileSync: () => options.brokenStaging ? "invalid-json" : '{"commit":"test-dev"}' };
    if (id.endsWith("app.cjs")) {
      if (options.brokenProduction && id.startsWith("./dist-server")) throw new Error("load failed");
      return { createApp: (opts?: { staging?: boolean }) => {
        const app = express(); app.get("/health", (_req, res) => res.json({ environment: opts?.staging ? "dev" : "production" }));
        return app;
      }, prepare: () => new Promise(() => {}) };
    }
    return realRequire(id);
  };
  vm.runInNewContext(source, { require: loader, module, __dirname: process.cwd(), console });
  const app = module.exports as express.Express;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const addr = server.address() as { port: number };
  const get = (p: string) => fetch(`http://127.0.0.1:${addr.port}${p}`);
  try {
    const ready = await get("/health/ready");
    assert.equal(ready.status, options.brokenProduction ? 503 : 200);
    assert.equal((await get("/health")).status, options.brokenProduction ? 503 : 200);
    const legacy = await fetch(`http://127.0.0.1:${addr.port}/dev/`, { redirect: "manual" });
    assert.equal(legacy.status,302);
    assert.equal(legacy.headers.get('location'),'/');
  } finally { server.closeAllConnections(); server.close(); }
}
test("obsolete staging files cannot prevent production serving", () => check({ brokenStaging: true }));
test("production bundle failure leaves readiness available", () => check({ brokenProduction: true }));
test("managed import loads root app without waiting for database prepare", () => check({}));
