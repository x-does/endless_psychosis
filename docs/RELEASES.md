# Main-only rapid testing

The owner switched to main-only development and hosting. All completed tested changes go directly to `main`; Hostinger auto-deploys the root site.

1. Update `main`, implement the change.
2. Run `npm test && npm run typecheck && npm run build:app`.
3. Commit and push `main` without force-pushing.
4. Verify https://psychosis.xdoes.space/health and the game after Hostinger finishes building.

Hostinger: branch `main`, Node 22, entry `app.js`, build `npm run build`, start `npm start`. The standard build enables all currently implemented features at `/`. Legacy `BUILD_STAGING=1` is ignored; it can be removed from hPanel. There is no separate dev snapshot build or staging deployment step.

The old dev branch and `endless_dev_saves` table may remain as historical data; they are not used for new work. Production continues using `DB_*` and `endless_saves`. No save migration or deletion is performed.

Older planning documents describe the previous release workflow; this document and AGENTS.md supersede those instructions.
