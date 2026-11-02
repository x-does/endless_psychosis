<img src="assets/icon.svg" width="64" height="64" alt="">

# Endless — The Long Way Home

A gentle, mobile-first endless runner about outrunning the fog, settling the spiral, and practicing healthy coping skills one chapter at a time.

Built with React, TypeScript, Vite, Express 5, Drizzle ORM and MySQL. Deployed on Hostinger as a Node.js web app (same pattern as `letscook`).

Repository: https://github.com/x-does/endless_psychosis.git

Deployment target: https://psychosis.xdoes.space — see [Hostinger setup](docs/HOSTINGER.md).

Release process: feature PR → `dev` → test `/dev/` → owner-approved promotion PR → `main`. See [release and staging setup](docs/RELEASES.md).

## HP Docker environment

The prepared HP checkout includes an ignored local `.env` with generated database passwords.

```sh
docker compose up -d --build
```

Open **http://192.168.0.139:5180** from a laptop or phone on the same LAN. MariaDB uses a persistent Docker volume. See [migration and development notes](docs/MIGRATION.md). For a fresh checkout, create `.env` with `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` before starting Compose.

## Local development

```bash
npm install
npm run dev        # Vite UI on http://localhost:5173
npm run dev:api    # API on http://localhost:3000 (optional, for cloud saves)
```

Vite proxies `/api` and `/health` to `http://localhost:3000`.

Cloud saves are optional locally. Without a database the UI stays fully playable and saves to `localStorage` (`endless.save.v1`); `/api/save` returns `503 database_not_configured`.

### Local database (optional)

```bash
docker run -d --name endless-db \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=endless \
  -e MYSQL_USER=endless \
  -e MYSQL_PASSWORD=endless \
  -p 3307:3306 mariadb:11

DB_HOST=127.0.0.1 DB_PORT=3307 DB_NAME=endless \
DB_USER=endless DB_PASSWORD=endless npm run dev:api
```

The `endless_saves` table is created automatically on startup.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run dev:api` | Express API with hot reload |
| `npm run build` | Typecheck, build the UI to `dist/`, bundle the API to `dist-server/app.cjs` |
| `npm start` | Run the production server (`node app.js`) |
| `npm run typecheck` | Typecheck client and server |
| `npm run preview` | Preview the built UI (no API) |

## Production / Hostinger deployment

The root `app.js` is a CommonJS bridge that loads `dist-server/app.cjs`, creates the Express app, prepares the database, and exports the app. It listens on `PORT` only when executed directly, so Hostinger can also import it.

### 1. Create the repository and database

1. Push this project to GitHub.
2. In hPanel go to **Databases → MySQL Databases** and create:
   - database, e.g. `uXXXXXXXXX_endless`
   - user, e.g. `uXXXXXXXXX_endless`
   - a strong password
3. Note the host (usually `localhost`), port (`3306`), database name and user.

### 2. Create the Node.js app

In hPanel open **Websites → Manage → Node.js** (or **Advanced → Node.js**) and set:

| Setting | Value |
| --- | --- |
| Node.js version | 22.x (minimum 22.12) |
| Application root | repository root |
| Application entry file | `app.js` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |

If your plan asks for a separate install command, use `npm ci --include=dev` so Vite, TypeScript and esbuild are available during the build.

### 3. Environment variables

Add these in the Node.js app's **Environment variables** section (copy `.env.example`):

```
NODE_ENV=production
PORT=3000
APP_VERSION=0.1.0
DB_HOST=localhost
DB_PORT=3306
DB_NAME=uXXXXXXXXX_endless
DB_USER=uXXXXXXXXX_endless
DB_PASSWORD=your-strong-password
```

`PORT` is usually supplied by Hostinger; setting it explicitly is harmless.

### 4. Deploy and verify

1. Connect the GitHub repository with auto-deploy on `main`.
2. Trigger a deploy, then check:
   - `https://your-domain/health` → `{"status":"ok",...}`
   - `https://your-domain/health/db` → `{"status":"ok","database":"connected"}`
   - `https://your-domain/` loads the game
   - `https://your-domain/journal` loads the SPA (client-side route)
3. Enable SSL in hPanel and force HTTPS.

Use the `dev` branch for staging if desired, and `main` for production.

### Notes

- `dist/`, `dist-server/`, `node_modules/` and `.env` are ignored by git; the build creates them on the server.
- The server serves the built SPA from `dist/` with an index.html fallback for client-side routes.
- If the database is missing or unreachable, the game still works offline and the UI reports cloud saves as unavailable.

## Cloud saves

- Each device generates a random 24-byte hex **sync code** stored in `localStorage` (`endless.cloud.code`).
- The server stores saves keyed by `SHA-256(sync code)` in `endless_saves`; the raw code is never stored.
- On launch the newer of local/cloud saves wins. Changes are pushed after a short debounce.
- **Settings → Cloud save** lets you copy the code, sync now, or enter a code from another device.
- The sync code is the only secret. Anyone with it can read and overwrite that save, so keep it private and use HTTPS.
- There is intentionally no account system.

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | App health |
| `GET` | `/health/db` | Database health (`ok`, `not_configured`, `error`) |
| `GET` | `/api/save` | Fetch the save for `Authorization: Bearer <sync code>` |
| `PUT` | `/api/save` | Upsert `{ "save": { ... } }` for the sync code |

Save payloads are validated with zod; the maximum request body is 256 kB.

## Project layout

```
src/               React UI, game engine, save + cloud client
server/            Express app, Drizzle schema, MySQL pool
app.js             Hostinger CommonJS entry
dist/              Built UI (generated)
dist-server/       Bundled server (generated)
```
