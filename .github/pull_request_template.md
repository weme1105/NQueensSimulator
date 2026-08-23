## Summary

Describe the change and why it is needed.

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:coverage` (70/70/70/70 minimum)
- [ ] `npm run audit`
- [ ] `npm run build`
- [ ] `npm run e2e`
- [ ] DEV site manually checked when UI behavior changed
- [ ] iPhone Safari checked when touch / pointer / canvas behavior changed

## Release safety

- [ ] No provider-specific dependency leaked into Core / Application
- [ ] Solver correctness rules are unchanged or covered by tests
- [ ] Economy / Cosmetic changes do not affect puzzle correctness
- [ ] Exact release SHA identified before merge to `main`
