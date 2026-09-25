# Sky's Adventure

A 2.5D downhill snowboarding game inspired by *Alto's Adventure*. Rendering
uses [Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/). All
gameplay logic (physics, jumping, tricks, coins, collisions) is written in
Python and runs client-side via [Pyodide](https://pyodide.org/). No backend
required - it deploys as a static site.

Ride down a fixed mountain course to the finish flag. Collect coins, launch
off ramps, and land mid-air spins for bonus score - avoid rocks, they end
your run.

## Controls

| Input                    | Action                              |
|---------------------------|--------------------------------------|
| Hold (mouse/touch/Space)  | Charge a jump while on the ground   |
| Release                   | Launch - longer hold = higher jump  |
| Tap while airborne        | Start a mid-air spin trick          |

The progress bar (top) shows distance to the finish flag. The HUD (top-right)
tracks distance, coins, and score.

## How it works

[src/pyBridge.js](src/pyBridge.js) loads Pyodide from a CDN, writes the
`.py` files into its virtual filesystem, and imports the `game` module.
Every frame, JS calls `game.step(dt)` and gets back a JSON string with the
player's position, rotation, state, and events (crash, landing, trick
bonus, coins). JS only renders that result and forwards input - it never
implements game rules itself.

## Project structure

```
final_project/
├── index.html
├── public/
│   └── py/                Python game logic, loaded into Pyodide
│       ├── terrain.py      course math: slope, obstacles, coins, finish line
│       ├── player.py       physics: speed, gravity, jump charge, tricks
│       └── game.py         orchestration + JSON API for JS
├── src/
│   ├── main.js            game loop: steps Python, renders the result
│   ├── pyBridge.js        loads Pyodide + the .py files
│   ├── scene.js           Three.js scene: sky, mountains, terrain, props
│   ├── riderView.js       rider's visual mesh (no physics)
│   ├── controls.js        charge-jump + trick input, forwards to Python
│   ├── ui.js              HUD, progress bar, popups, overlays
│   └── style.css
├── vite.config.js
└── package.json
```

The course is fixed, not randomly generated - `ground_height(x)` in
[public/py/terrain.py](public/py/terrain.py) is a closed-form function, with
hand-placed obstacles and coins at fixed positions.

## Development

Requires [Node.js](https://nodejs.org/) 18+ and an internet connection
(Pyodide loads from a CDN at runtime).

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build in dist/
npm run preview   # preview the production build
```

Edit files under [public/py](public/py) and refresh the page to see changes.

## Publishing to GitHub Pages

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds the site
with Vite and deploys `dist/` to GitHub Pages on every push to `main`. Vite
copies `public/py/*.py` into `dist/py/` automatically.

Steps:

1. Push this folder's contents to a GitHub repository (as the repo root, or
   adjust the workflow's paths if it's a sub-folder).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` - the game will be live at
   `https://<username>.github.io/<repo>/`.
