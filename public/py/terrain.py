"""Fixed downhill course definition for Sky's Adventure.

This module is loaded into Pyodide and runs entirely client-side in the
browser (WebAssembly) - it owns all course/game math. The JavaScript side
only reads the data/results this module produces in order to render the
Three.js scene; no gameplay logic lives in JS.
"""
import math

COURSE_LENGTH = 420  # world units from start to finish flag
FINISH_X = COURSE_LENGTH


def ground_height(x):
    """Smooth downhill slope with rolling bumps, built from fixed sine waves."""
    return (
        -0.11 * x
        + 3.2 * math.sin(x * 0.045)
        + 1.6 * math.sin(x * 0.11 + 1.3)
        + 0.7 * math.sin(x * 0.23 + 0.6)
    )


def slope_at(x):
    """dy/dx via central finite difference - speeds the player up downhill."""
    h = 0.5
    return (ground_height(x + h) - ground_height(x - h)) / (2 * h)


# 'rock': solid mound on the ground - hitting it while grounded ends the run.
# 'ramp': launch ramp that automatically boosts the player upward when ridden
# over, encouraging trick attempts.
OBSTACLES = [
    {"type": "rock", "x": 46, "width": 3.2, "height": 1.6},
    {"type": "ramp", "x": 70, "width": 6, "height": 2.2},
    {"type": "rock", "x": 112, "width": 3.6, "height": 1.8},
    {"type": "rock", "x": 118, "width": 3.0, "height": 1.5},
    {"type": "ramp", "x": 150, "width": 7, "height": 2.8},
    {"type": "rock", "x": 196, "width": 4.0, "height": 2.0},
    {"type": "ramp", "x": 230, "width": 6, "height": 2.4},
    {"type": "rock", "x": 268, "width": 3.4, "height": 1.7},
    {"type": "rock", "x": 274, "width": 3.4, "height": 1.7},
    {"type": "ramp", "x": 310, "width": 7, "height": 3.0},
    {"type": "rock", "x": 356, "width": 3.8, "height": 1.9},
    {"type": "ramp", "x": 388, "width": 6, "height": 2.4},
]

COINS = [
    {"x": 60, "height": 2.2},
    {"x": 64, "height": 2.6},
    {"x": 68, "height": 3.0},
    {"x": 150, "height": 3.4},
    {"x": 154, "height": 3.8},
    {"x": 158, "height": 4.0},
    {"x": 230, "height": 3.0},
    {"x": 234, "height": 3.4},
    {"x": 238, "height": 3.6},
    {"x": 310, "height": 3.6},
    {"x": 314, "height": 4.0},
    {"x": 318, "height": 4.2},
    {"x": 388, "height": 2.6},
    {"x": 392, "height": 3.0},
    {"x": 396, "height": 3.2},
]


def obstacle_at(x):
    """Returns the obstacle under/near world x, or None."""
    for o in OBSTACLES:
        if o["x"] - o["width"] / 2 <= x <= o["x"] + o["width"] / 2:
            return o
    return None
