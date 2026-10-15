# Static hosting and security pass

The app runs in the browser and builds to `my_way/dist`. It needs no API server, account or secret. Saved projects and recordings stay in the visitor’s browser; bundled solution replays are shipped with the app and available to every visitor.

## GitHub Pages

In the repository’s **Settings → Pages**, choose **GitHub Actions** as the source. The prepared [workflow](../../.github/workflows/ci.yml) installs dependencies, audits runtime packages, lints, tests, builds and checks browser workflows before uploading the Pages artifact. Deployment uses `pages: write` and `id-token: write`; it does not write a `gh-pages` branch or rebuild the same artifact twice.

The default base is `/Fractal-Maze/`. A generated `404.html` redirects clean deep links through the app entry; the entry restores the local route, query and hash before rendering. A `.nojekyll` file is included. No site has been published by this work.

## Your website

From `my_way`, build for the chosen mount:

```bash
npm ci
VITE_BASE_PATH=/ npm run build
# Or, for a subdirectory:
VITE_BASE_PATH=/mazes/ npm run build
```

Upload the **contents** of `dist` to that directory. Asset URLs, routing, workers, favicon and manifest use the same configured base. On your own server, configure unknown app routes to serve that directory’s `index.html`; on Pages the provided 404 redirect handles them. Build paths must start and end with `/` and stay local.

For example, an nginx mount at `/mazes/` can use `try_files $uri $uri/ /mazes/index.html;` in its `location /mazes/` block. Enable HTTPS in your hosting settings. Vite preview is a local test server, not the public server.

## Verified deployment

Direct Build, proof-workspace and Alice replay routes, plus their refreshes, passed on a plain static Pages-style server at `/Fractal-Maze/` and a root website server with an index fallback. No page errors or CSP violations were recorded. [Checks and review captures](screenshots/authors-proofs/index.html).

## Changes in this pass

- Updated React Router, Vite and Vitest within their current major versions to clear the dependency audit. React Router’s reported server-framework RCE does not affect this client-only browser app; updating still removes affected package versions. [Primary advisory](https://github.com/advisories/GHSA-49rj-9fvp-4h2h).
- Shared-URL documents validate before storage; oversized URL payloads are rejected. Maze, artwork and replay files are limited to 20 MB. SVG extraction rejects excessive detail and keeps source markup in an inert XML document.
- Replay imports validate actual square, geometric, portal, repeated, block, tour and proof transitions. Legal surface exits may leave the grid; arbitrary off-grid positions are rejected through move validation. Proof steps require rechecked embedded claims, never a bare descendant hypothesis.
- Wolf wire imports now use the shared PDA player in Play, Solve and Build. The embedded player and command bridge are removed; the original local program remains a reference asset. Original wire document exports retain their validated bundled-player reference.
- Production HTML supplies a Content Security Policy permitting local scripts/workers/frames and image data URLs, while blocking arbitrary script origins, plugins and form submission. Referrer policy is set. React renders imported text without HTML insertion. Zod uses ordinary parsing so it does not attempt eval under the production CSP.
- Pages load their workspace code on demand. The storage layer no longer eagerly imports the full catalog just to save/load local projects. Default production entry falls from about 3.81 MB / 756 kB gzip to about 357 kB / 112 kB gzip. Large source/model chunks still load when the collection or relevant workspace needs them; their warnings are retained.
- Removed unused Vite template styling/icon. Settings and metadata receive format validation; source licenses and original project files are preserved.

The CSP is delivered as HTML because GitHub Pages does not let this repository configure response headers. On a website you control, also use equivalent response headers, `X-Content-Type-Options: nosniff`, and a `frame-ancestors` policy appropriate to whether you want other sites to embed the app. Full security certification, unavailable complexity/mutation metrics and mathematical completeness of the hop rules are not claimed.

Build/deployment guidance follows the [official Vite static-hosting documentation](https://vite.dev/guide/static-deploy.html). See the [current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan) for verification and remaining solution gaps.

## Unified Play follow-up

Home, combined Solve & analyze (`/solver?id=…`), live Play, maze-local replay (`/play/:id?replay=…`) and an empty proof notebook passed direct-link and refresh checks on both Pages-style and root hosting: 20 checks, no page errors or CSP violations. [Current hosting evidence](screenshots/unified-play/hosting-checks.json) and [current review](UNIFIED_PLAY.md). The latest entry is approximately 413 kB / 130 kB gzip; large artwork, catalog and replay chunks remain on demand. The browser router is created after restoring the Pages redirect, so unfinished-run navigation guards also work on direct static links. The final runtime dependency audit reports zero vulnerabilities.

## Current complete-build checks

Fresh `/Fractal-Maze/` and `/` builds pass 40 direct-link/refresh checks on plain static servers. These include Home, Library, Build, the combined solver, live and replay Alice, both newly playable Koteitan patterns and Infinite Descent’s empty notebook/shared certificate. A finite solver worker runs successfully after direct navigation and refresh on both mounts. No page errors, failed resources or CSP violations occur. [Current results](STATIC_HOSTING_CHECKS.json).

Reproduce after building both mount variants:

```bash
npm run build
VITE_BASE_PATH=/ npm run build -- --outDir /tmp/fractal-root-build
python scripts/check-static-hosting.py /tmp/fractal-root-build
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing browser. `npm audit --omit=dev` and the complete `npm audit` both report zero known vulnerabilities in the current lockfile. Large catalog/artwork chunks still produce build warnings. This validates local static artifacts; publishing remains a separate action.

The latest build passes 80 direct-link/refresh checks on Pages and root hosting, including shared Wolf Play/Solve/Build, geometric playback, proof solutions, both million-move register recordings and worker execution. Recording and cover URLs use the configured base. Publish the complete contents of `dist`, including `solutions/` and `library-covers/`. Shared recordings load only on selection; Library uses a generated metadata/cover index while saved-project previews load their actual renderer. [Current hosting results](STATIC_HOSTING_CHECKS.json), [Library loading checks](LIBRARY_LOADING_CHECKS.json), [Wolf cutover](WIRE_PDA_CHECKS.json).

## October 12 loading and recovery checks

Play now fetches one selected, validated maze document from `mazes/`, instead of importing every catalog model and drawing. The authored canonical catalog still supplies the asset generator and contract checks. All 74 generated documents match their canonical rules, hydrated artwork and metadata; concurrent loads share the request while returning independent editable copies, and failed loads remain retryable. Runtime adapters use small model/artwork bindings without pulling in the authoring catalog.

Cold production Play loads 824 KB of decoded JavaScript, down from 3.88 MB (79% less), plus its selected JSON: about 4 KB for Alice and 17 KB for Tsat. Home's canvas hash is unchanged. These are Resource Timing body sizes on a local preview, not simulated user-network or gzip-transfer benchmarks. [Current measurement](STARTUP_LOAD_CHECKS.json), [before partitioning](STARTUP_LOAD_BEFORE_PARTITION.json).

The complete production browser suite passes 129 workflows. Static Pages/root checks pass 100 direct-link/refresh cases, including all three compact register solutions and worker execution. All 77 shared snapshots import successfully. Current dependency audit has zero known vulnerabilities. Authored production TypeScript quality measurements are in [the current report](CODE_QUALITY_CHECKS.json); unavailable metrics remain explicitly unmeasured.

Publish the complete `dist` directory, including `mazes/`, `solutions/`, `library-covers/` and `references/`. The recovered historical Python/Svelte source is outside the active app's build and has no runtime dependency installation. [Historical recovery scope](HISTORICAL_WORK_REVIEW.md).
