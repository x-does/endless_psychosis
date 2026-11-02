# MI → HP migration — 2026-11-02

Source: `/home/mi/.t3/projects/endless` on MI. Destination: `/home/hp/.t3/projects/endless-psychosis` on HP. Repository: `https://github.com/x-does/endless_psychosis.git`.

The MI project had no commits on `main`; its working tree contained the implementation. The original archive (including MI's Git checkpoint objects) is retained privately on HP, separate from the new repository history. Transfer archive SHA256: `7ca26bf9fa109c3f31bdb2939d0dbf569bae0802589832acec9a71f9ade865bd`.

## Original development evidence

The source thread describes React/TypeScript/Vite mobile-first gameplay, chapters and bosses, coping-technique journal, browser saving, anonymous sync codes, and an Express/Drizzle/MySQL backend. Earlier reviews requested iteration on mobile layout, controls, HUD labels, support links, code masking, and journal actions. The latest source includes UI changes responding to those reviews; the thread does not establish final council approval.

The old Dockerfile invoked `dist-server/app.cjs`, which only exports functions and exits. HP now starts `node app.js`. Production asset paths now resolve relative to the compiled module rather than the process working directory. Request debug logging of origins/referrers and raw error text in HTTP responses were removed.

## HP usage

```sh
docker compose up -d --build
docker compose logs --tail=100 app
docker compose down
```

Game: `http://192.168.0.139:5180` on the same LAN; API health: `/health` and `/health/db`.

For hot-reload development, install Node 22 and run `npm ci`, then `npm run dev:api` and `npm run dev` in separate terminals. Vite uses port 5173 and proxies `/api` and `/health` to port 3000. Use a reachable local MySQL instance for cloud-save development; Docker's internal hostname `db` is only available inside Compose.

Reference threads:
- Endless: `fe535b6b-ce43-4034-b051-d03051e786b2` on MI.
- Letscook: `import:codex:01a12f42-3d0c-7f22-a26e-a0268f974deb` on HP.
