# Main-only workflow

- The owner requests all completed, tested changes directly on `main`.
- Run `npm test`, `npm run typecheck` and `npm run build:app` before committing/pushing.
- Hostinger tracks `main` and automatically rebuilds https://psychosis.xdoes.space/ after pushes.
- Do not use `dev`, `/dev`, staging snapshots or promotion PRs for new work.
- The standard `npm run build` builds all current game features at `/`, ignoring legacy BUILD_STAGING settings.
- Preserve production saves in `endless_saves`; do not copy or delete old staging saves.
- Verify live deployment separately from GitHub push success.
