# Release workflow

- Implement changes on feature branches based on `dev`. Open PRs targeting `dev`.
- Run `npm run typecheck` and `npm run build:app` before committing.
- Merging to `dev` publishes staging at `https://psychosis.xdoes.space/dev/` once Hostinger's main build is refreshed.
- Promotion is a PR from `dev` to `main`. Never merge that PR or push directly to `main` without the owner's explicit approval for that release.
- Production and staging share DB_* credentials but use separate tables: endless_saves and endless_dev_saves. Never copy production saves into staging automatically.
- Hostinger serves production from main; `BUILD_STAGING=1` builds a pinned dev snapshot into `/dev`. Do not change the production hosting branch to dev.
