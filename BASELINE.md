# Production Baseline 01

Established: 2026-08-19

This document records the first clean production baseline after branch cleanup and the deployment rules adopted afterward.

- `main` is the production branch.
- `develop` is the active test branch.
- `/` serves the production build from `main`.
- `/dev/` serves the test build from `develop`.
- Production and DEV behavior must be implemented in source code before build.
- Build artifacts must not be patched or rewritten after build.
- CI/CD may only copy build artifacts and add deployment metadata such as version files.
- DEV uses its own Vite base path under `/NQueensSimulator/dev/`.

Standard flow:

1. Modify source.
2. Run tests.
3. Build.
4. Deploy the resulting artifact without changing application HTML/JS/CSS after build.
5. Verify the deployed SHA from the version file.

Future changes should be validated on `develop` first and promoted to `main` only after DEV verification.
