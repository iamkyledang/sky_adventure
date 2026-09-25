"""Top-level game orchestration for Sky's Adventure.

This is the only module JavaScript calls into directly (via Pyodide). It
owns the single Player instance and coin-collection state, and exposes a
small JSON-based API so the JS side never needs to touch Python objects
directly - every call here returns a plain JSON string.
"""
import json
import terrain
from player import Player

FINISH_X = terrain.FINISH_X

_player = None
_coins_collected = None


def _obstacle_view(o):
    """Adds a render anchor point (position + ground height) to an obstacle."""
    anchor_x = o["x"] if o["type"] == "rock" else o["x"] - o["width"] / 2
    return {
        "type": o["type"],
        "x": o["x"],
        "width": o["width"],
        "height": o["height"],
        "anchor_x": anchor_x,
        "ground_y": terrain.ground_height(anchor_x),
    }


def get_course_data():
    """Static course geometry/props for the JS renderer to build the scene from."""
    samples = []
    x = -20.0
    end = FINISH_X + 20.0
    while x <= end + 1e-9:
        samples.append([x, terrain.ground_height(x)])
        x += 2.0

    data = {
        "finish_x": FINISH_X,
        "course_length": terrain.COURSE_LENGTH,
        "ground_samples": samples,
        "obstacles": [_obstacle_view(o) for o in terrain.OBSTACLES],
        "coins": [
            {"x": c["x"], "y": terrain.ground_height(c["x"]) + c["height"]}
            for c in terrain.COINS
        ],
        "finish_ground_y": terrain.ground_height(FINISH_X),
    }
    return json.dumps(data)


def reset():
    """Starts a fresh run and returns the initial state (see step())."""
    global _player, _coins_collected
    _player = Player()
    _coins_collected = [False] * len(terrain.COINS)
    return step(0.0)


def start_charge():
    _player.start_charge()


def release_charge():
    _player.release_charge()


def _check_coins():
    newly = []
    for i, c in enumerate(terrain.COINS):
        if _coins_collected[i]:
            continue
        dx = _player.x - c["x"]
        dy = _player.y - (terrain.ground_height(c["x"]) + c["height"])
        if dx * dx + dy * dy < 0.6 * 0.6:
            _coins_collected[i] = True
            newly.append(i)
    return newly


def step(dt):
    """Advances the simulation by dt seconds; returns the new state as JSON."""
    events = _player.update(dt)
    newly_collected = _check_coins()

    finished = False
    if _player.state == "running" and _player.x >= FINISH_X:
        _player.state = "finished"
        finished = True

    result = {
        "x": _player.x,
        "y": _player.y,
        "rotation": _player.rotation,
        "state": _player.state,
        "crashed": events["crashed"],
        "landed": events["landed"],
        "trick_bonus": events["trick_bonus"],
        "finished": finished,
        "coins_collected": newly_collected,
        "progress": min(1.0, max(0.0, _player.x / FINISH_X)),
    }
    return json.dumps(result)
