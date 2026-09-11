# Puddle Post verification — September 10, 2026

## User story

Open the rendered village → start with one tap → control umbrella lift → navigate gaps → deliver near envelopes → see a letter enter the mailbox and a resident respond → finish a route → retain a personal record → retry or return home. Pause, keyboard, resizing, and phone layouts are part of the same flow. No backend boundary exists.

## Automated model tests

`npm test`: **7 passed, 0 failed**.

- Lift followed by gravity.
- No-input ground collision and frozen model after death.
- Steady controller completes at least 30 homes and 25 deliveries on each of 40 different seeds over an 80-second simulation per seed. This exercises recycled gates, later difficulty, delivery placement, and score accounting.
- One letter cannot count multiple times while the player remains inside its pickup area.
- Missing an envelope does not kill a safely positioned mouse.
- Obstacle and ceiling collisions.
- Restart clears flight state and counters.

The first controller test revealed insufficient clearance on some late routes. Passage sizes, letter placement, and the umbrella collision envelope were adjusted. All 40 seeds pass with the final model. This is controller feasibility testing, not human difficulty or retention research.

## Browser observations

Tested through the Codex browser interface on the user's Windows machine with all audio disabled.

| Flow | Result |
|---|---|
| Desktop title and game | Original 3D mouse, umbrella, scenery and animated rain render; no console errors. |
| Desktop continuous route | Development controller reached 12 letters / 12 homes in 26.175 seconds and paused. |
| Delivery response | Score increments, letter moves toward mailbox, cottage window lights, resident appears; 12-delivery streak notice shown. |
| Neighbourhood progress | Willow Lane → Teacup Terrace → Clover Common, with 5-home route progress. |
| Pause / resume | P key, pause dialog and resume button verified; input focus returns to game. |
| Failure / results | Releasing controls after the route produces the result panel with 12 letters and 12 homes. |
| Persistence | Reload shows BEST ROUTE 12 from the completed development flight. |
| Retry | Retry resets both counters to zero and starts a fresh flight. |
| Keyboard dialog focus | Two Tab presses cycle from retry through home and back to retry; background header is inert while modal is open. |
| Phone layout, 390 × 844 | Title, character, start button and result dialog inspected. Title size and button width corrected after first pass. |
| Phone continuous route | 12 letters / 12 homes in 26.175 seconds; pause and result totals confirmed. |
| Landscape, 844 × 390 | Resize preserves paused state; dialog and controls fit. |
| Audio | Sound remains false throughout. Effects were not played audibly. |
| Final production preview | HTTP 200 at port 4179; fresh BEST ROUTE 00; no development controls or console errors. Start, Space, P, and return-home smoke-tested after the final layout adjustment. |
| Actual Codex panel, approximately 610 × 640 | Aligned scene and interface compact breakpoints so the umbrella no longer overlaps the title/description; inspected the corrected scene. |

## Observed performance

These are recent frame samples from this machine, not universal device benchmarks. Physics uses fixed steps; renderer telemetry keeps the latest 240 frame durations.

- Desktop 1280 × 720 CSS viewport, 1600 × 900 drawing buffer: median approximately **6.1 ms**, 95th percentile **6.4 ms**, 364 draw calls and approximately 350k triangles in the observed active scene before the final shadow refinement.
- Final phone-sized viewport on this computer, 390 × 844 drawing buffer: median **6.1 ms**, 95th percentile **6.2 ms**, 136 draw calls, 119,066 triangles in the observed paused scene after its continuous flight.
- Both runs reported `sound: false` and no captured warning/error logs.
- A later visible production title sample with other testing surfaces open measured median 12.1 ms / p95 18.2 ms. Paused scenes now skip redundant WebGL renders, and the temporary development tab was closed before handoff.

The narrow viewport test is not a physical mobile GPU/touch test. Frame statistics are drawn from short windows and do not establish sustained performance on other devices. The integration clamps unusually long simulation deltas to avoid dangerous jumps after interruptions.

## Build and assets

`npm run build`: passed. Vite 7.3.6.

- JavaScript: approximately 524 kB raw / 136 kB gzip, including Three.js.
- CSS: approximately 11 kB raw / 3.3 kB gzip.
- Entire static output, including seven fonts and license notices: approximately 972 kB uncompressed.
- Vite emits its default advisory for a JavaScript chunk above 500 kB; there is no build error. This is the complete WebGL engine plus game, not a failed code-split.
- Fonts are local. No runtime font/CDN/API dependency remains.
- Verified that the development flight-check button and Google Fonts URL are absent from production assets.

## Limits

No independent human play study, physical phone test, audible sound review, public deployment, or service-worker installation was performed. WebGL is required. Game-over on lost graphics context presents a reload explanation. Browser storage failures are caught and simply leave records session-local.

## Evening palette revision

Production build passed after the aesthetic revision. Inspected the live production title in the actual Codex panel and checked the desktop layout. The moon, stars, lavender sky, varied colourful homes, green bushes, warm windows and apricot interface render without captured console warnings or errors. No physics changes were made; this visual-only revision uses the existing gameplay verification.

## Current difficulty / reward revision

All **13 model tests pass**, including the existing 40-seed route feasibility test and new tests for the first three gentle homes, subsequent tier/gap variation, tier-to-reward mapping, exact streak bonuses, missed-letter streak reset, collision-before-reward ordering, level thresholds at deliveries 10/20/30, smooth speed transitions, and full reset. Production build passes.

A continuous development browser run reached **22 deliveries, 645 points, Level 3** at 46.258 seconds; its target speed was **3.372375 world units/second**, exactly 2.55 × 1.15². The browser score agrees with the independent model trace saved in **balance-sample.json**. The screen showed 2/10 toward Level 4 and a 50-point tight passage followed by a 10-point wide passage. Captured console warnings/errors: none. Recent frame median 12 ms, p95 12.2 ms on this computer during this run. This does not establish physical-mobile performance or human retention.

## 20% player-size reduction

Applied shared PLAYER_SCALE = 0.8 to the complete mouse/umbrella group, contact shadow, player collision extents, and ground/top clearances. All **14 model tests pass**, including a new tight-gap boundary check proving that the smaller umbrella can pass a height that previously collided and still collides when too high. Production build passed and the refreshed smaller character was visually inspected in the current preview.

## Netlify production deployment

Published to https://puddle-post.netlify.app/ with deploy ID 6aa27bd985b0cd7a6d5263fc. All 14 static files returned HTTP 200 and matched local SHA-256 hashes. The live browser rendered the evening game and smaller mouse, with working Start/Space/P/pause controls and no captured warnings/errors. See NETLIFY_DEPLOYMENT.md and netlify-asset-checks.json for the reproducible handoff.

## Player size correction — September 10, 2026

Changed the shared player scale from 0.8 to 0.9: mouse and umbrella now measure 90% of their original dimensions, with matching collision bounds and clearances. All 14 model tests passed, including the tight-gap clearance test and 40 seeded routes. Production build passed; all 14 deployed files returned HTTP 200 and matched local SHA-256 hashes.


## Tighter gaps and faster start — September 11, 2026

Reduced all 10/25-point gap heights and their variation by 20%, including the first three homes; reduced 50-point gaps and variation by 10%. Increased initial speed from 2.55 to 3.06. Compared 3,200 generated gates against the previous committed model: all exact requested ratios passed, with rewards and vertical centers preserved. All 14 gameplay tests passed, including the unchanged pilot across 40 seeded routes. Updated the speed-easing assertion to use relative remaining acceleration (under 2% after one second), so it scales with initial speed. Production build passed with the existing bundle-size advisory. GitHub push is intended to trigger the user's connected Vercel deployment; this change does not redeploy the older Netlify instance.

## Free Flight mode — September 11, 2026

Added a separate FreeFlight simulation with horizontal acceleration, drift, braking, additive lift, moving violet hazards, and optional 10/25/50-point deliveries. Letters remain available for a return trip until offscreen. Separate storage protects Classic Route scores. Eight new tests cover braking, lift cooldown, return delivery exactly once, misses, umbrella hazard collision before reward, route variation, reset, and bounded recycling over a 250-second simulation. All 22 tests pass. Browser Free Flight rendered open skies and storm sparks, completed two deliveries and reached the result screen after collision. Start/pause/resume and mode selection inspected, with no captured warnings/errors. A full long free-flight playability study is still outstanding; classic model routes retain their existing 40-seed checks.

Phone-size review (390×844) caught and fixed pointer-event inheritance on the new selector. Both modes are now selectable by pointer; Free Flight shows the left/right/lift controls. Its selector sits above the existing play button without covering the mouse. Switching modes shows their separate records. Restart now explicitly clears delivered-envelope animation state.

## Free Flight fall recovery — September 11, 2026

Lift now guarantees positive upward velocity even from terminal descent, with gentler gravity and a lower falling-speed cap. All 24 simulation tests pass, including a single rescue tap close to the floor and recovery across five falling velocities. In the real browser loop, the development falling-recovery check began at y=-2.8 with vy=-3.6, tapped after 0.12 seconds, and paused alive at 0.60 seconds at y=-2.37758 with vy=+0.81. Sound stayed off. This verifies recovery from the reported failure condition; player feedback remains necessary to judge the overall feel. Classic Route behavior is unchanged.
