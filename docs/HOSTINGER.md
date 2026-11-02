# Deploy psychosis.xdoes.space

## hPanel configuration

Create a **Node.js / Express web app**, connect `https://github.com/x-does/endless_psychosis.git`, and select:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Node | 22.x, at least 22.12 |
| Root | Repository root (`.`) |
| Entry file | `app.js` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Domain | `psychosis.xdoes.space` |

This follows the Letscook Node/Express + MySQL hosting pattern. `app.js` both exports the Express app for managed loading and listens when started with Node. The build creates `dist/` and `dist-server/`; source control excludes generated output. `.npmrc` includes the build-time development dependencies.

## Database and environment

1. In hPanel, create a **new, dedicated MySQL database and user** for this game. Grant that user access to the new database, including CREATE TABLE, SELECT, INSERT and UPDATE. The app creates `endless_saves` on startup.
2. Use the private `.env.hostinger` file provided on HP. Replace `DB_NAME`, `DB_USER`, and `DB_PASSWORD` with the actual hPanel values. `DB_HOST` is usually `localhost`; use the hostname hPanel specifies.
3. Import the file through the Node app's Environment Variables interface. If deploying the file itself, name it `.env` in the application root, outside the public assets directory. Restart/redeploy after setting variables.
4. Keep `PORT` at the platform-provided value if Hostinger supplies one. Otherwise the default is 3000.
5. Deploy the `main` branch and enable HTTPS for the domain.

Required cloud-save variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Optional: `DB_PORT` (3306), `PORT` (3000), `APP_VERSION` (0.1.0), `NODE_ENV` (production). No SMTP, authentication secret, third-party API key, or frontend URL variable is used by this game. Browser calls use same-origin `/api` URLs.

The generated HP `.env` is for Docker development only; upload `.env.hostinger`, not HP's local database settings. Database placeholders are intentionally unfilled until hPanel creates the new credentials.

## Verify deployment

```sh
curl --fail https://psychosis.xdoes.space/health
curl --fail https://psychosis.xdoes.space/health/db
curl --fail https://psychosis.xdoes.space/journal
```

The database endpoint must report `database: connected`; `not_configured` means only browser-local saving is available. Open the game, save progress, and use Settings → Cloud save to sync and restore the code on another browser. Save codes grant access to their save; keep them private.

## Backups and migration

Back up `endless_saves` through hPanel before upgrades. HP's Docker database has its own persistent volume; `docker compose down` preserves it. Never use `down -v` unless you intend to delete local saves.

Existing browser saves on MI's old IP remain in that browser's origin storage; moving source does not transfer browser localStorage to the new domain. Use a cloud sync code for saves previously synced to the migrated database. A new empty Hostinger database will not have those saves unless you import the old `endless_saves` rows.
