// Fixed, deterministic downhill snowboarding course for "Sky's Adventure".
// The whole course is defined by closed-form math (sums of sines) rather
// than random generation, so every playthrough is identical, testable, and
// tunable by hand - similar in spirit to the frozen maze grid this project
// started with.

export const COURSE_LENGTH = 420; // world units from start to finish flag
export const FINISH_X = COURSE_LENGTH;

// --- Terrain silhouette ----------------------------------------------------
// groundHeight(x) is a smooth downhill slope (negative = lower) with rolling
// bumps layered on top, built from a few fixed sine waves. Using a function
// instead of sampled data means collision/physics can query any x exactly.
export function groundHeight(x) {
  return (
    -0.11 * x +
    3.2 * Math.sin(x * 0.045) +
    1.6 * Math.sin(x * 0.11 + 1.3) +
    0.7 * Math.sin(x * 0.23 + 0.6)
  );
}

// Slope (dy/dx) via central finite difference - used to speed the player up
// on downhill sections and slow them on uphill sections, Alto-style.
export function slopeAt(x) {
  const h = 0.5;
  return (groundHeight(x + h) - groundHeight(x - h)) / (2 * h);
}

// --- Obstacles --------------------------------------------------------------
// 'rock': solid mound sitting on the ground - touching it while grounded
// (not airborne over it) ends the run. 'ramp': a launch ramp that gives the
// player an automatic upward boost when ridden over, encouraging tricks.
export const OBSTACLES = [
  { type: 'rock', x: 46, width: 3.2, height: 1.6 },
  { type: 'ramp', x: 70, width: 6, height: 2.2 },
  { type: 'rock', x: 112, width: 3.6, height: 1.8 },
  { type: 'rock', x: 118, width: 3.0, height: 1.5 },
  { type: 'ramp', x: 150, width: 7, height: 2.8 },
  { type: 'rock', x: 196, width: 4.0, height: 2.0 },
  { type: 'ramp', x: 230, width: 6, height: 2.4 },
  { type: 'rock', x: 268, width: 3.4, height: 1.7 },
  { type: 'rock', x: 274, width: 3.4, height: 1.7 },
  { type: 'ramp', x: 310, width: 7, height: 3.0 },
  { type: 'rock', x: 356, width: 3.8, height: 1.9 },
  { type: 'ramp', x: 388, width: 6, height: 2.4 },
];

// --- Coins --------------------------------------------------------------
export const COINS = [
  { x: 60, height: 2.2 },
  { x: 64, height: 2.6 },
  { x: 68, height: 3.0 },
  { x: 150, height: 3.4 },
  { x: 154, height: 3.8 },
  { x: 158, height: 4.0 },
  { x: 230, height: 3.0 },
  { x: 234, height: 3.4 },
  { x: 238, height: 3.6 },
  { x: 310, height: 3.6 },
  { x: 314, height: 4.0 },
  { x: 318, height: 4.2 },
  { x: 388, height: 2.6 },
  { x: 392, height: 3.0 },
  { x: 396, height: 3.2 },
];

/** Returns the obstacle under/near world x, or null. */
export function obstacleAt(x) {
  for (const o of OBSTACLES) {
    if (x >= o.x - o.width / 2 && x <= o.x + o.width / 2) return o;
  }
  return null;
}
