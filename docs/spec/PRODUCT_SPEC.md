# NQueensSimulator Product Specification

Status legend: **DECIDED** = agreed product rule; **TBD** = intentionally unresolved.

## Product modes

### DECIDED — Main progression
- Level mode provides progressive learning/difficulty.
- Difficulty mode lets experienced players directly select a difficulty.
- Main level progression milestones:
  - 1–199: newcomer/tutorial/entry progression
  - 200–399: beginner
  - 400–599: intermediate
  - 600–799: advanced
  - 800–999: expert
  - 1000: King milestone / final main-campaign trial
  - 1001+: unlimited progression
- Board size alone must not define difficulty. Difficulty must be derived from required reasoning complexity.

### DECIDED — Human reasoning foundation
A platform-independent Human Solver / reasoning model will be shared by:
- difficulty analysis;
- tutorial explanations;
- hints;
- automatic reasoning actions.

### DECIDED — Daily challenge
The ranked daily challenge uses the same puzzle for all players that day.
- The first ranked attempt does not allow assist items.
- Ranking score considers solving quality such as time and mistakes/X usage according to the scoring specification.
- After the ranked challenge is completed, the same challenge may be reopened as practice.
- Practice may use assist items and does not enter/update ranked results.

### DECIDED — Timed challenge
Two timed formats are planned.
1. Single-puzzle timed challenge: remaining time contributes to score; timeout means challenge failure.
2. Queen Rush: solve as many puzzles as possible within the time limit; completed puzzle count contributes strongly to score; completing zero puzzles means challenge failure.

### DECIDED — Special challenge
Special boards may modify normal board structure/rules, initially including concepts such as uncolored cells and removed/unusable cells. The architecture should use composable board modifiers so additional special rules can be added later. Special challenges may award exclusive titles or Honor Crowns.

### DECIDED — Perfect streak
Perfect consecutive clears are tracked. Primary rewards are prestige/cosmetic rewards such as titles and special crowns rather than assist consumables. Exact streak thresholds/rewards remain TBD.

### DECIDED — Challenge replay integrity
Ranked performance must not be improved by memorizing/replaying the same board. Ranked attempts and practice attempts are separate. Transformations/puzzle pools may additionally be used for non-daily challenge variants.

## Assist behavior

### DECIDED — Solve one step
`solve-step` executes one logical reasoning step and exposes that step's reasoning/result to the player.

### DECIDED — Solve to next queen
`solve-next-queen` continues reasoning until the next queen is deterministically revealed. Intermediate textual reasoning does not need to be shown, but all intermediate X marks produced by the reasoning must remain visible on the board before the queen is revealed.

## App direction

### DECIDED
- Web remains supported.
- Core/application logic must be platform independent and reusable by a future iOS/Android app.
- New core logic must not depend on DOM/window/document/localStorage.
- Current direction is Local First: players can start anonymously without login and preserve local progress.
- When a player later authenticates, existing local progress is associated with the account rather than forcing a restart.

## TBD
- Exact difficulty scoring weights and thresholds.
- Exact timed challenge durations and Queen Rush time-extension rules, if any.
- Exact special challenge catalog.
- Exact tutorial level content and count beyond the initial progressive-learning direction.
