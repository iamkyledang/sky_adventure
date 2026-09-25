# Sky's Adventure

A 2.5D downhill snowboarding game inspired by *Alto's Adventure*. Rendering
is [Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/); **all
gameplay logic (physics, jumping, tricks, coins, collisions) is real Python**,
running entirely client-side in the browser via
[Pyodide](https://pyodide.org/) (CPython compiled to WebAssembly). No
backend, no build-time Python dependency - it still deploys as a plain
static site.

Ride down a fixed mountain course from start to the finish flag. Collect
coins, launch off ramps, and land mid-air spins for bonus score - but watch
out for rocks, they'll end your run if you don't jump over them.

## Controls

| Input                    | Action                              |
|---------------------------|--------------------------------------|
| Hold (mouse/touch/Space)  | Charge a jump while on the ground   |
| Release                   | Launch - longer hold = higher jump  |
| Tap while airborne        | Start a mid-air spin trick          |

The progress bar (top) shows how far you are from the finish flag. The HUD
(top-right) tracks distance, coins collected, and total score.

## How the Python actually runs in the browser

On page load, [src/pyBridge.js](src/pyBridge.js):

1. Injects the Pyodide runtime from a CDN (`cdn.jsdelivr.net/pyodide`) - a
   WebAssembly build of CPython. This is a runtime download, not a build
   step, so the site is still 100% static files.
2. Fetches the three `.py` files below as plain text and writes them into
   Pyodide's in-memory filesystem, then `import game` - real Python module
   imports, exactly like running locally.
3. Every frame, JS calls `game.step(dt)` and gets back a JSON string
   describing the player's new position/rotation/state and any events
   (crashed, landed, trick bonus, coins collected). JS only ever reads this
   JSON - **JavaScript never implements game rules**, it just renders
   whatever Python computed and forwards input events back to Python.

## Project structure

```
final_project/
├── index.html            entry HTML (canvas, HUD, progress bar, overlays)
├── public/
│   └── py/                Python game logic, served as static files, loaded into Pyodide
│       ├── terrain.py      course math: slope, obstacles, coins, finish line
│       ├── player.py       snowboarder physics: speed, gravity, jump charge, tricks
│       └── game.py         orchestration + the JSON API JS calls into
├── src/
│   ├── main.js            game loop: calls into Python each frame, renders the result
│   ├── pyBridge.js        loads Pyodide + the .py files, exposes a small JS API
│   ├── scene.js           Three.js scene: sky, parallax mountains, snow, props
│   ├── riderView.js        builds the rider's visual mesh (no physics)
│   ├── controls.js        single-input charge-jump + trick controls (forwards to Python)
│   ├── ui.js              HUD, progress bar, trick popups, win/crash overlays
│   └── style.css
├── vite.config.js
└── package.json
```

The course is **not** randomly generated. `ground_height(x)` in
[public/py/terrain.py](public/py/terrain.py) is a fixed closed-form function
(sums of sine waves) describing the slope, with hand-placed rock/ramp
obstacles and coins at fixed x positions - every playthrough uses the exact
same level.

## Development

Requires [Node.js](https://nodejs.org/) 18+ and an internet connection (to
fetch Pyodide from the CDN at runtime, both in dev and once deployed).

```bash
npm install
npm run dev       # start a local dev server with hot reload
npm run build     # produce an optimized static build in dist/
npm run preview   # locally preview the production build
```

Editing the `.py` files under [public/py](public/py) and refreshing the
page is enough to see changes - they're loaded fresh into Pyodide on each
page load.

## Publishing to GitHub Pages

This repo includes a ready-to-use GitHub Actions workflow at
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) that builds the
site with Vite and deploys the `dist/` output to GitHub Pages automatically
on every push to `main`. Vite copies `public/py/*.py` into `dist/py/` as
plain static files automatically, so no extra configuration is needed for
the Python side.

Steps to enable it:

1. Push this folder's contents to a GitHub repository.
   - If you push **only** `final_project/` as the repo root, the workflow
     works as-is.
   - If you keep it as a sub-folder of a bigger repo, move
     `.github/workflows/deploy.yml` to the repo root and prefix the
     `working-directory`/paths with `final_project/` (see the comment at the
     top of that file).
2. In the GitHub repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` - the workflow builds and publishes automatically. Your
   game will be live at `https://<username>.github.io/<repo>/`.

Because `vite.config.js` uses `base: './'` (relative paths), the build works
at any sub-path without extra configuration.
