# Shared high score

The home screen shows a large centered HIGH SCORE and the existing smaller games-played count. Personal best remains local and separate. Puddle Post switches the shared record with the selected mode.

Starting records were supplied by the user: Classic Route 1,650; Free Flight 1,155; Balloon Trip 120. Each corresponding game uses these as minimum starting records until a completed run exceeds them. Existing visitor counts are untouched.

The frontend records compressed flight input commands: taps, fixed simulation steps, steering, held lift, and viewport changes. On game over, the server replays the same versioned physics and derives the score itself. A posted number alone cannot set a record. Concurrent writes use conditional ETags; only a greater score replaces the stored record. Storage persists across deployments, with separate game/mode keys. Scores refresh on visible title screens every five seconds and after submitting a run. Displayed scores never move backwards due to stale responses. Games remain playable during API outages.

Production stores use game-scores; preview stores use game-scores-preview. Vercel frontend builds use the existing public Netlify score endpoint, sharing records across both hosts without credentials or new environment variables. Keep the Netlify service active.

Validation is appropriate for a casual game: deterministic input replay prevents arbitrary score injection, but does not establish that a human supplied the inputs or prevent bots generating valid runs. Replay uploads are limited to 256 KB, 25,000 commands, and 216,000 simulation steps (30 minutes). Longer games still play normally but are not submitted to the shared record. Retries are bounded; a prolonged outage may prevent a completed score from being recorded. Historical personal best values cannot be reconstructed as replays and are not automatically imported. Physics changes must account for replay-version compatibility before deployment.

No accounts, names, explanatory panels, or leaderboard forms were added. Raw input traces are processed for validation and are not stored in the leaderboard; stored records contain score and update time only.

## Verification

Six tests per project cover exact replay equivalence including resizing/held lift, rejection of invalid and unfinished input, independent mode records, concurrent maxima, the supplied starting records, API computation rather than trusting a score field, and stale/network response handling. The full suites contain 37 Puddle Post tests and 29 Balloon Trip tests.

The draft-only scripts/verify-high-score.mjs validates actual server replay and storage without setting synthetic production records. Puddle Post verified runs of 85 and 20 points preserved 1,650 and 1,155. Balloon Trip verified a 332-point run, raised its preview record above 120, and retained it on duplicate submission. Both APIs rejected arbitrary score payloads. Evidence is saved in high-score-api-check.json.

Desktop and 390x844 layouts were reviewed, including switching Puddle Post between its two records. Sound remained off.
