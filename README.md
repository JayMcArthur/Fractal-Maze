# Fractal Maze

The active application is the static React/TypeScript app in **[my_way](my_way/README.md)**.
It uses block gameplay, optional image covers, maze-local solution replays and a manual proof notebook. It runs entirely in the browser.

## Develop and build

On NixOS, from `my_way`:

```sh
nix develop path:. --command npm ci
nix develop path:. --command npm run dev
nix develop path:. --command npm run build
```

The locked shell provides the pinned Node runtime, Chromium and offline verification tools. Other hosts can install the Node version in `my_way/.node-version` and run `npm ci` there. Publish the complete `my_way/dist` directory. The default mount is `/Fractal-Maze/`; see [hosting instructions](my_way/docs/STATIC_HOSTING.md) for another website path.

Current planning is in SilverBullet: from this checkout use `workspace notes context` and `workspace notes plan`.

## Original programs and historical work

The other programs, source images, `web/`, Python packages, schemas and root `docs/` are preserved historical references. They are outside the active app build. The earlier workbench and its original documentation are also preserved byte-for-byte under `upstream_sources/JayMcArthur-Fractal-Maze/`; see [the recovery review](my_way/docs/HISTORICAL_WORK_REVIEW.md). The old Svelte Pages publisher is replaced by `.github/workflows/ci.yml`, which tests and deploys `my_way/dist`.

[Original maze collection and program links](COLLECTION.md) remain available.
