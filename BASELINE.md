# Production Baseline 01

Established: 2026-08-19

This commit is the first clean production baseline after branch cleanup.

- `main` is the only active branch.
- GitHub Pages builds and deploys from `main` only.
- `/` serves the current production UI and production logic.
- `/dev/` temporarily mirrors `main` until a new `develop` branch is created.
- The existing production UI shell is preserved.
- No new feature behavior is introduced by this baseline commit.

Future development should branch from this baseline, modify source code, run tests, build, and then deploy a DEV candidate before merging back to `main`.
