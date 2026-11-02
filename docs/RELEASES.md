# Development, staging and production

## Everyday workflow

1. Branch from `dev`: `git switch dev && git pull && git switch -c feature/your-change`.
2. Implement and run `npm run typecheck && npm run build:app`.
3. Push the feature branch and open a PR **targeting dev**. Merge after checks pass.
4. Refresh the Hostinger main deployment to build the latest pinned dev snapshot, then test **https://psychosis.xdoes.space/dev/**. Production still uses main's code.
5. Open a promotion PR **from dev to main**. Wait for the owner's explicit approval of that release before merging. Never auto-merge a promotion.
6. After approved merge, Hostinger rebuilds main. Verify `/health` and `/health/db` and the live game.

The repository CI rejects PRs targeting main unless their source branch is dev. Branch protection requires the build check and prevents force pushes/deletion. GitHub cannot require the owner's review on their own PR; the explicit owner approval rule in AGENTS.md still applies.

## One-time Hostinger setup (required to activate staging)

Keep the website attached to **main**. Keep the build command `npm ci --include=dev && npm run build`, entry `app.js`, and Node 22. Add:

```dotenv
BUILD_STAGING=1
DEV_DB_HOST=localhost
DEV_DB_PORT=3306
DEV_DB_NAME=YOUR_NEW_STAGING_DATABASE
DEV_DB_USER=YOUR_NEW_STAGING_DATABASE_USER
DEV_DB_PASSWORD=YOUR_NEW_STAGING_DATABASE_PASSWORD
```

Create a dedicated staging database/user in hPanel. Never reuse production credentials. If DEV_DB settings are absent, staging is playable with isolated browser-local saves, but cloud save is disabled; there is no fallback to production DB settings. `/dev/health/db` must say connected before testing cloud saves.

The initial infrastructure PR must be promoted to main with owner approval once. Until that happens, the existing main application cannot serve an independent staging build. Afterward the build downloads the public dev branch at an exact commit, builds its frontend with `/dev/` paths and bundles its server, and mounts both under `/dev`. `/dev/health` reports the pinned staging commit. Main dependencies must remain compatible with staged server dependencies; dependency changes may require a coordinated infrastructure update.

## Automatic refresh after dev merges

If hPanel provides a deploy webhook for this website, save it as the GitHub Actions secret **HOSTINGER_DEPLOY_HOOK**. The deployment workflow POSTs to it after successful push checks on dev or main. Configure the hook to rebuild **main**, never switch the hosting branch to dev. If no deploy hook is available, redeploy main manually in hPanel after dev merges. A GitHub push alone does not prove staging deployed.

The build fetches public GitHub source without credentials. It fails rather than silently claiming a staging update when downloading or building dev fails.

## Isolation and verification

- Production browser keys stay `endless.save.v1` and `endless.cloud.code`.
- Staging uses `endless.dev.save.v1` and `endless.dev.cloud.code`, and `/dev/api/save`.
- Staging uses only DEV_DB_* configuration; production uses DB_*.
- Root production routes and staging assets are built separately.

Verify `/health`, `/health/db`, `/dev/health`, `/dev/health/db`, and ensure staging HTML uses `/dev/assets/`. Record the staging commit from `/dev/health` when requesting approval.
