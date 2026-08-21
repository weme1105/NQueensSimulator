# Release Checklist

## Automated gates

Before merging to `main`, all automated gates must pass:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:coverage` — minimum 70% statements / branches / functions / lines
- `npm run audit`
- `npm run build`
- `npm run e2e` against production preview
  - Chromium Desktop
  - Chromium Mobile
  - WebKit Desktop
  - WebKit Mobile
- Legacy JavaScript syntax check
- Legacy DOM smoke test

Any failed gate blocks release.

## DEV verification

Before promotion to `main`:

- Confirm DEV SHA matches the intended release commit.
- Confirm DEV URL loads without console errors.
- Confirm board can be created at representative sizes: 4×4, 8×8, 12×12, 20×20.
- Confirm random generation correctly rejects sizes above 12×12.
- Confirm region editing, play mode, Undo, Clear, annotations, settings and hidden solver unlock work.
- Confirm display settings persist after reload.
- Confirm no unexpected horizontal overflow on mobile.

## Real-device release check

At least once before production release:

- iPhone Safari portrait
- iPhone Safari landscape
- Tap / double-tap behavior
- Drag behavior
- Canvas drawing / eraser
- Page scrolling vs board gestures
- Settings modal
- No accidental page zoom during board interaction

## Promotion

Recommended flow:

`develop` → Pull Request → all required checks green → merge to `main` → Pages deploy

Do not publish from a failed build or from an unverified commit SHA.

## Post-deploy smoke

After GitHub Pages reports successful deployment:

- Production URL returns successfully.
- DEV URL returns successfully.
- `deployment-version.txt` is available.
- `PROD_SHA` / `DEV_SHA` match the branch commit that triggered deployment.
- Board markup is present in both deployed sites.

The `Post-deploy smoke` workflow performs these endpoint checks automatically.
