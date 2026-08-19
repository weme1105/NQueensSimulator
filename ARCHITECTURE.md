# NQueensSimulator Architecture

## Goal

Keep game and solver logic portable so the same core can be reused by the current Web app and a future iOS/Android shell.

## Layer boundaries

### `src/core/`
Platform-independent domain code.

Allowed:
- TypeScript data structures
- deterministic game rules
- solver contracts
- difficulty analysis
- level definitions
- pure transformations

Forbidden:
- `window`
- `document`
- DOM element types
- `localStorage`
- browser event handling
- deployment-specific paths

### `src/solver/`
Current solver implementation and Web Worker transport. During refactoring, existing imports remain compatible through facade exports from `solver/types.ts` while domain contracts move into `core/`.

Target split:
- pure solver engine -> `core/solver/`
- worker messages/client -> Web adapter layer

### Web UI modules
Current DOM-oriented modules such as `uiLayout.ts`, `freeRegionEditor.ts`, `annotationCanvas.ts`, and `main.ts` remain browser adapters. They may depend on `core/`, but `core/` must never depend on them.

## Build rule

Application behavior must be finalized in source before build.

`Source -> Test -> Build -> immutable artifact -> Deploy`

No HTML/JS/CSS patching after build.

## Migration sequence

1. Extract board domain types into `core/board`.
2. Extract solver contracts into `core/solver`.
3. Move pure solver engine/pipeline/generator logic into `core/solver` without changing behavior.
4. Keep Worker transport as a Web adapter.
5. Introduce application services for game session/progress.
6. Add Human Solver and Difficulty Analyzer in `core/`.
7. Add level and difficulty game modes above the shared core.
8. Add persistent storage through repository interfaces so Web can use browser storage and mobile can use native storage.

## Baseline

Production baseline remains `eafddbff752ed465729cdc872222a48abbeba05b` on `baseline-2026-08-19`. Refactoring work must not move or modify that baseline ref.
