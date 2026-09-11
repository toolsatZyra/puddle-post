# Puddle Post — Netlify production

- Live game: https://puddle-post.netlify.app/
- Site ID: `8703cf8a-98d6-4890-9aa9-354c388df489`
- Team: ThreeMusketeers
- Production deploy ID: `6aa3a4ceef7ff86cf9dae3d1`
- Immutable deploy: https://6aa3a4ceef7ff86cf9dae3d1--puddle-post.netlify.app/
- Deploy dashboard: https://app.netlify.com/projects/puddle-post/deploys/6aa3a4ceef7ff86cf9dae3d1
- Published September 10, 2026, with the user's explicit authorization.

This is a manual static deployment of `dist/`, not Git-triggered continuous deployment. The Netlify project is linked locally through ignored `.netlify/state.json`; `netlify.toml` records build/publish settings and cache headers. No credentials or secret environment variables were added to the project.

## Verification

Fresh production build passed. All 14 published static files returned HTTP 200 and matched their local SHA-256 hashes, including the HTML, current JS/CSS bundles, fonts, icon and license files. Details: `netlify-asset-checks.json`.

Opened the HTTPS production site in the Codex browser. The evening village and smaller mouse rendered, sound stayed off, and Start / Space / P / pause dialog worked. No captured console warnings or errors. The hosting platform displays its Netlify badge. Browser graphics verification complements the existing 14 model tests and prior continuous scoring/level tests.

## Publish updates

```sh
npm run build
npx netlify-cli deploy --prod --dir dist --no-build --site 8703cf8a-98d6-4890-9aa9-354c388df489
```

On this Windows environment, `NODE_USE_SYSTEM_CA=1` was used for the authenticated CLI network calls. Authentication remains in the existing Netlify CLI account session, outside this project.

September 11 update: Free Flight and Classic Route published together. The code commit be035f70c63e599f83a6af6393ad5bca46962a22 also deployed successfully through the connected Vercel project: https://puddle-post-rill1vwqo-zyras-projects-c775ae8c.vercel.app . Both published game modes were selectable, Free Flight start/pause worked, and no browser console warnings/errors were captured.
