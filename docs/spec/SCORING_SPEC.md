# Scoring and Leaderboard Specification

Status legend: **DECIDED** = agreed product rule; **TBD** = intentionally unresolved.

## DECIDED — Separate concepts
The product keeps these concepts separate:
- **Level progress**: where the player is in the 1–1000+ progression.
- **Score**: performance in a specific game/challenge.
- **Rating**: long-term competitive skill indicator.
- **Leaderboard**: ranking view based on the relevant competitive metric/rules.

Level number must not be reused as Rating.

## DECIDED — Score components
The scoring architecture supports versioned components including:
- base completion score;
- difficulty contribution;
- remaining-time/time-performance bonus;
- move/solution-quality bonus;
- X/mistake quality bonus or penalty;
- hint/assist effects.

The exact formula remains versioned (`scoreVersion`) so balancing changes do not make historical results ambiguous.

## DECIDED — Assist-item scoring
Assist items do not automatically disqualify an ordinary completed game from scoring/ranking. Their use reduces or removes performance bonuses according to the scoring policy. The intended principle is that assistance helps progression but does not purchase a competitive advantage.

Daily ranked challenges are stricter: assist items are disabled during the ranked attempt.

## DECIDED — Global leaderboard identity
- Anonymous/local play may accumulate personal/local scores.
- Global leaderboard submissions are only generated from games completed after the player is authenticated.
- Scores earned before authentication remain personal history and are not retroactively submitted to the global leaderboard.

## DECIDED — Daily challenge ranking
- All ranked participants receive the same daily puzzle.
- The ranked attempt does not allow assist items.
- Practice after completion does not update the ranked result.

## DECIDED — Timed scoring principles
### Single-puzzle timed challenge
- Completion is required.
- Remaining time contributes to score.
- Timeout = challenge failure.

### Queen Rush
- Number of completed puzzles is a major scoring factor.
- Difficulty/quality may further weight results.
- Zero completed puzzles = challenge failure.

## DECIDED — Rating
Rating is a separate long-term skill system and must not simply equal cumulative score. It should account for demonstrated solving performance/difficulty and avoid becoming a pure playtime/grind counter.

## TBD
- Rating formula and rating tiers/names.
- Exact score weights.
- Exact X/mistake definition for each mode.
- Whether some leaderboards are segmented by Rating cohort, level-progression stage, or both.
- Tie-breaking order for equal leaderboard scores.
