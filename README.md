# Sky's Adventure

A 2.5D downhill snowboarding game built with [Three.js](https://threejs.org/)
and [Vite](https://vitejs.dev/), inspired by *Alto's Adventure*. Runs entirely
in the browser - no server, no Python, no build step required to *play* once
it's built as a static site.

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

## Project structure

```
final_project/
├── index.html          entry HTML (canvas, HUD, progress bar, overlays)
├── src/
│   ├── main.js           wires everything together + game loop
│   ├── terrain.js        fixed course: slope math, obstacles, coins, finish
│   ├── player.js          snowboarder physics: speed, jump, gravity, tricks
│   ├── scene.js           Three.js scene: sky, parallax mountains, snow, props
│   ├── controls.js        single-input charge-jump + trick controls
│   ├── ui.js              HUD, progress bar, trick popups, win/crash overlays
│   └── style.css
├── vite.config.js
└── package.json
```

The course is **not** randomly generated. `groundHeight(x)` in
[src/terrain.js](src/terrain.js) is a fixed closed-form function (sums of
sine waves) describing the slope, with hand-placed rock/ramp obstacles and
coins along fixed x positions - every playthrough uses the exact same level.

## Development

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev       # start a local dev server with hot reload
npm run build     # produce an optimized static build in dist/
npm run preview   # locally preview the production build
```

## Publishing to GitHub Pages

This repo includes a ready-to-use GitHub Actions workflow at
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) that builds the
site with Vite and deploys the `dist/` output to GitHub Pages automatically
on every push to `main`.

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
