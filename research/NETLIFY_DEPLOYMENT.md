# Puddle Post — Netlify production

- Live game: https://puddle-post.netlify.app/
- Site ID: `8703cf8a-98d6-4890-9aa9-354c388df489`
- Team: ThreeMusketeers
- Production deploy ID: `6aa3cf63a59fd86021ef800c`
- Immutable deploy: https://6aa3cf63a59fd86021ef800c--puddle-post.netlify.app/
- Deploy dashboard: https://app.netlify.com/projects/puddle-post/deploys/6aa3cf63a59fd86021ef800c
- Updated September 11, 2026, with the user's authorization.

This is a manual deployment of the static frontend and Netlify counter function, not Git-triggered continuous deployment. The Netlify project is linked locally through ignored `.netlify/state.json`; `netlify.toml` records build/publish settings and cache headers. No credentials or secret environment variables were added to the project.

## Verification

Fresh production build passed. All 14 published static files returned HTTP 200 and matched their local SHA-256 hashes, including the HTML, current JS/CSS bundles, fonts, icon and license files. Details: `netlify-asset-checks.json`.

Opened the refreshed HTTPS production site in the Codex browser. Free Flight selection, Start / Space / P / pause dialog worked, with sound off and no captured console warnings or errors. The hosting platform displays its Netlify badge. Browser verification complements all 24 model tests, including the new terminal-fall recovery checks.

## Publish updates

```sh
npm run build
npx netlify-cli deploy --prod --dir dist --no-build --site 8703cf8a-98d6-4890-9aa9-354c388df489
```

On this Windows environment, `NODE_USE_SYSTEM_CA=1` was used for the authenticated CLI network calls. Authentication remains in the existing Netlify CLI account session, outside this project.

September 11 update: Free Flight and Classic Route published together. The code commit be035f70c63e599f83a6af6393ad5bca46962a22 also deployed successfully through the connected Vercel project: https://puddle-post-rill1vwqo-zyras-projects-c775ae8c.vercel.app . Both published game modes were selectable, Free Flight start/pause worked, and no browser console warnings/errors were captured.

September 11 recovery update: commit 71d76435d2011dc2d1db3da8b2b4872ce16c660d pushed to GitHub main and received a successful Vercel deployment status. Netlify deploy above contains the stronger rescue lift, gentler gravity, and lower falling-speed cap. All 14 published files matched local SHA-256 hashes.

September 11 counter update: deployed the shared home-page-load counter with the requested Number of games played label, a starting offset of 179, and no info note or icon. Production uses its own persistent store; preview checks did not change the live total. All 31 tests pass and all 14 published static assets match the build. GitHub main includes code commit 21c8cfb; Vercel reported a successful production deployment. See COUNTER.md for the API checks.
