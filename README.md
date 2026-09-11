# Puddle Post

A little mouse, a big umbrella, and a village waiting for its post. An original, fully playable 3D one-button game made for the My Websites collection.

**Play online: [puddle-post.netlify.app](https://puddle-post.netlify.app/)**

Deployment details and update instructions: [research/NETLIFY_DEPLOYMENT.md](research/NETLIFY_DEPLOYMENT.md).

## Play locally

Requires Node.js 20.19+ or 22.12+ (developed with Node 24).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4178/. For an optimized production build:

```sh
npm run build
npm run preview -- --port 4179
```

Open http://127.0.0.1:4179/. The `dist/` folder can be deployed to any static host. All runtime resources, including fonts, are bundled locally. There is no API key, backend, account, or paid service to configure. A running local server is required; do not open `index.html` directly from disk. The current public deployment is https://puddle-post.netlify.app/.

## Controls and rules

Choose **Classic route** for the original gap game or **Free flight** for open skies and optional deliveries. Free Flight uses Left/Right or A/D to accelerate, coast, brake, and reverse. Space/Up/W adds lift; hold X or the mobile Lift control for repeated lift. Avoid the moving violet storm sparks, rooftops, and boundaries. Letters remain collectible after you pass them until they leave the screen, so you can double back. Low village letters earn 10 points, wandering letters 25, and high express letters 50. Levels and streak bonuses still apply; each mode keeps a separate personal best. Free Flight starts with slower world scrolling to leave room for steering, and uses its own momentum-based lift model. Each new Free Flight run gets a fresh random seed.

Free Flight recovery tuning: a tap during a fall immediately restores upward velocity of at least 2.9 world units/second. Gravity is 4.4 units/second² and falling speed is capped at 3.6 units/second, giving more time to recover. Repeated taps retain a 0.12-second cooldown and a bounded maximum lift speed. These values apply only to Free Flight.

The following gap rules and single-button controls describe Classic Route:

- Tap/click the scene, or press **Space**, **Up**, or **W** to lift. Release and gravity gently brings the mouse down. Use individual, steady taps.
- Float through the gaps between cottages and hanging planters. Touching an obstacle, the ground, or the top of the playfield ends the route. Rain, decorative plants, envelopes, and mailboxes do not collide.
- Fly near a glowing envelope to send that letter down to its mailbox. The cottage lights up and a resident waves. Deliveries are automatic; there is no second action to learn.
- The first three homes have gentle wide gaps. From home four onward, shuffled groups contain a wide, medium, and tight passage, with no repeated difficulty tier on adjacent homes. Passage height and vertical position also vary. Reward badges show the points before you reach each letter: **10 / 25 / 50** for wide / medium / tight gaps.
- Gap heights are 20% smaller for 10- and 25-point deliveries and 10% smaller for 50-point deliveries, including their random variation. The first three homes use the same reduced 10-point gap. Nominal heights are 3.92 / 3.16 / 2.835 world units. Starting speed is 3.06 world units per second, 20% faster than the original 2.55.
- Every **10 successful deliveries** raises the level by one. Target speed compounds by **15%**: Level 1 = 100%, Level 2 = 115%, Level 3 = 132.25%, and so on. Acceleration eases smoothly into the new target; scenery and obstacles use the same speed. Passing a home without delivering never advances the level. Every five homes still advances the decorative neighbourhood name.
- **P / Escape** pauses and resumes. Leaving the tab or resizing automatically pauses. Resume preserves flight velocity.
- Sound starts **off**. Use the speaker button or **M** to opt into gentle synthesized effects. No recordings, microphones, or autoplay audio.
- Every five consecutive deliveries awards **20 extra points**. A missed letter resets the streak without removing earned points or ending a safe flight. Points, deliveries, homes passed, and level are tracked separately. Best points persist in `puddle-post.records`; legacy letter/home records remain preserved and are not mistaken for points.

## Art and implementation decisions

Three.js renders original smooth procedural meshes: the mouse, umbrella panels and ribs, boots, mail satchel, scarf, rounded cottages, hanging planters, leaves, letters, lamp, and residents. No raster character sprites, downloaded character models, or pixel art are used. Geometry retains clean edges as the viewport changes; the renderer uses antialiasing and device pixel ratio up to 2.

The composition uses a late-evening lavender and indigo sky, a glowing moon and subtle stars, peach/powder-blue/lilac/butter-yellow cottages, plum roofs, amber windows, and a yellow umbrella. The original green bushes remain as a contrasting accent. Soft contact shadows, atmospheric perspective, gentle rain streaks and expanding lavender puddle rings retain the smooth miniature feel. The interface uses warm cream text, apricot buttons, and plum ink. The mouse blinks and its ears, feet, scarf, and umbrella animate independently. A successful delivery animates the letter toward the mailbox and lights the resident's window.

Physics runs at a fixed 120 Hz with interpolated rendering, independent of the monitor refresh rate. Geometry and materials are reused; static scenery is batched, obstacles are pooled, and particles are recycled. Inputs never allocate new scenes. The mouse and umbrella are uniformly scaled to 90% of their original size in the title and gameplay. Their collision extents and ground/top clearances use the same shared scale; obstacle dimensions and delivery pickup reach retain their existing values. The model uses a forgiving mouse-and-umbrella collision envelope, with extra visual tip clearance. Reduced-motion preferences remove interface transitions and reduce rain density; essential gameplay motion remains.

The title screen is a live rendered scene. The game has no simulated AI response or generation claim. Runtime imagery and animation are generated by this project's code.

## Verification

```sh
npm test
npm run build
```

See [research/VERIFICATION.md](research/VERIFICATION.md) for observed browser and model results. For repeatable development browser inspection, open `/?verify=1` and select **Run 22-delivery flight check**. This runs a simple controller through the real game loop and pauses after 22 deliveries (or 32 homes if letters were missed). **Release controls** hands the flight back to the player. These controls are compiled out of the production build. Automated test results establish reproducible functionality, not whether a human player will find the game addictive.

## Source and licensing

- Inspiration: [Mosswing — Small wings. Endless wonder](https://mosswing-quiet-flight.jack-514.chatgpt.site/), inspected September 10, 2026. Its one-button lift/gravity/retry structure and gentle 3D presentation informed the brief. Puddle Post's code, geometry, character, world, and delivery system were created independently. The third party's model-authorship claim was not independently verified.
- [Three.js](https://threejs.org/) — MIT license; see `public/THREE-LICENSE.txt`.
- [Vite](https://vite.dev/guide/) — build and development tooling.
- DM Sans and Fraunces — locally hosted Google Fonts distributions, SIL Open Font License. License texts are included in `public/fonts/`.

## Remaining limits

Requires WebGL and a modern browser. Performance was measured on this Windows computer in the Codex Chromium browser; phone-sized viewports were tested on this computer, not on physical Android/iPhone hardware. Audio synthesis is implemented but was not audibly reviewed, to respect silent development. The scene uses stylized glossy puddles and soft lighting, not expensive real-time reflections. No service-worker offline installation, touch-hardware test, or independent player study has been performed.

## Shared home-screen counter

The top badge reads **Number of games played** and counts home-page loads from a starting offset of 179. Each successful reload increments a persistent shared total; open home screens refresh every five seconds. A Netlify Function and Blobs store power the counter, including when this frontend runs on Vercel. See [research/COUNTER.md](research/COUNTER.md) for semantics, development setup, tests, and deployment instructions. There are now 31 tests. Gameplay remains available if the counter service is unavailable.
