# Shared home-screen counter

The main label is **Number of games played — N**, as requested. The user requested a single line with no explanatory note on the game screen. The underlying metric is a starting offset of 179 plus successful home-page loads, including repeat visits. It does not measure unique people, completed rounds, or concurrent players.

- First accepted load changes 179 to 180. GET reads never increment. Returning to the title without reloading does not increment.
- The browser sends one UUID per document load, retries failed requests with the same UUID, and refreshes the visible home screen every five seconds. No polling during gameplay or while the tab is hidden. There are no tracking cookies, fingerprints, or client identifiers retained between loads.
- Each game uses its own site-scoped Netlify Blobs store. Counters survive deployments. Puddle Post served from Vercel uses the same public Netlify API, so both production hosts share one Puddle Post total.
- Strongly consistent reads and conditional ETag writes prevent lost concurrent updates. The last 512 load UUIDs guard against duplicate retries. Failed writes without a confirmed ETag fail closed; the UI never invents an increased total.
- Production uses `game-counter`; draft deployments use `game-counter-preview`. Vite development shows a clearly isolated local 179 without touching production. Use Netlify Dev with `?counter=1` to exercise a local API.
- This is an approximate, public load counter, not audited analytics. Script blockers, network outages, bot traffic, and deliberate reloads affect it. A rate limit of 120 API requests per IP per minute bounds casual abuse. Function/storage usage is billed under the existing Netlify plan; no new subscription or external database was provisioned.
- On connection failure, keep the last received number and dim the status dot. Before the first response, show an ellipsis. The game never waits for the counter.

## Verification

Seven new tests per project cover initial state, twelve concurrent increments, duplicate retries, invalid API input, unavailable storage, the SDK's unconfirmed-write case, monotonic client display, and one POST per page. Run `npm test`.

`node scripts/verify-counter.mjs <draft-url>` checks eight concurrent increments against real storage and retries the same IDs without adding to the count. It refuses production URLs. Saved evidence: `counter-api-check.json`. Puddle Post passed directly; an initial Balloon Fight storage 503 was surfaced, then the check passed using the same retry approach as the browser.

Two Puddle Post browser pages displayed the shared preview total changing from 188 to 189; the first page updated without a reload. Phone-size layouts (390x844) were inspected. The badge is excluded from Puddle Post's global tap-to-start handler. Sound stayed off.

## Deployment

Run `npm run build`, then `npx netlify-cli deploy --prod --dir dist --functions netlify/functions --no-build`. The functions directory is also specified in netlify.toml. On this Windows host set `NODE_USE_SYSTEM_CA=1`. No browser credential or API secret is needed; the public API only supports incrementing by one with a load UUID and reading the count.

Sources: [Netlify Blobs conditional writes](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [Functions API](https://docs.netlify.com/build/functions/api/), and [SDK conditional-write issue](https://github.com/netlify/primitives/issues/741).

