"""Snowboarder physics for Sky's Adventure - pure Python, no rendering.

Runs inside Pyodide (WebAssembly) in the browser. JavaScript reads the
resulting x/y/rotation/state each frame (via game.py) to update the
Three.js mesh; all movement, gravity, jumping and trick math happens here.
"""
import math
import terrain

PLAYER_HALF_HEIGHT = 0.5
GRAVITY = -26
MIN_SPEED = 9
MAX_SPEED = 26
SLOPE_ACCEL = 34  # how strongly downhill slope speeds you up
JUMP_BASE = 8
JUMP_CHARGE_MAX = 6.5  # added on top of JUMP_BASE at full charge
MAX_CHARGE_TIME = 0.55  # seconds of holding to reach full charge
RAMP_LAUNCH_BOOST = 11
SPIN_SPEED = math.pi * 2.2  # radians/sec while spinning
LANDING_TOLERANCE = 0.35  # radians of allowed rotation error on landing


class Player:
    def __init__(self):
        self.x = 0.0
        self.y = terrain.ground_height(0) + PLAYER_HALF_HEIGHT
        self.vy = 0.0
        self.speed = MIN_SPEED + 3
        self.grounded = True
        self.rotation = 0.0
        self.spin_velocity = 0.0
        self.total_rotation = 0.0
        self.state = "running"  # running | airborne | crashed | finished
        self.charge_time = 0.0
        self.charging = False
        self._last_ramp_x = None

    def start_charge(self):
        if self.state not in ("running", "airborne"):
            return
        if self.grounded:
            self.charging = True
            self.charge_time = 0.0
        else:
            # Airborne tap: begin/continue a trick spin.
            self.spin_velocity = SPIN_SPEED

    def release_charge(self):
        if self.charging and self.grounded:
            t = min(self.charge_time, MAX_CHARGE_TIME)
            power = t / MAX_CHARGE_TIME
            self.vy = JUMP_BASE + JUMP_CHARGE_MAX * power
            self.grounded = False
            self.state = "airborne"
            self.total_rotation = 0.0
        self.charging = False
        self.charge_time = 0.0

    def update(self, dt):
        """Advances physics by dt seconds. Returns an events dict."""
        events = {"crashed": False, "landed": False, "trick_bonus": 0}
        if self.state in ("crashed", "finished"):
            return events

        if self.charging and self.grounded:
            self.charge_time += dt

        slope = terrain.slope_at(self.x)
        self.speed += -slope * SLOPE_ACCEL * dt
        self.speed = max(MIN_SPEED, min(MAX_SPEED, self.speed))
        self.x += self.speed * dt

        ground = terrain.ground_height(self.x)

        if self.grounded:
            self.y = ground + PLAYER_HALF_HEIGHT
            self.rotation = math.atan(terrain.slope_at(self.x))

            obstacle = terrain.obstacle_at(self.x)
            if obstacle and obstacle["type"] == "rock":
                self.state = "crashed"
                events["crashed"] = True
                return events
            if obstacle and obstacle["type"] == "ramp" and self._last_ramp_x != obstacle["x"]:
                self._last_ramp_x = obstacle["x"]
                self.vy = RAMP_LAUNCH_BOOST
                self.grounded = False
                self.state = "airborne"
                self.total_rotation = 0.0
                self.charging = False
        else:
            self.vy += GRAVITY * dt
            self.y += self.vy * dt

            if self.spin_velocity != 0:
                delta = self.spin_velocity * dt
                self.rotation += delta
                self.total_rotation += delta

            floor = ground + PLAYER_HALF_HEIGHT
            if self.y <= floor and self.vy <= 0:
                self.y = floor
                self.vy = 0.0
                self.grounded = True
                self.spin_velocity = 0.0

                obstacle = terrain.obstacle_at(self.x)
                if obstacle and obstacle["type"] == "rock":
                    self.state = "crashed"
                    events["crashed"] = True
                    return events

                spins = self.total_rotation / (2 * math.pi)
                nearest_whole = round(spins)
                error = abs(spins - nearest_whole) * 2 * math.pi
                attempted_trick = abs(self.total_rotation) > 0.5

                if attempted_trick and error <= LANDING_TOLERANCE and nearest_whole != 0:
                    events["trick_bonus"] = abs(nearest_whole) * 50
                    self.rotation = 0.0
                elif attempted_trick:
                    # Wipeout: bad landing costs speed but the run continues.
                    self.speed = max(MIN_SPEED, self.speed * 0.35)
                    self.rotation = 0.0
                else:
                    self.rotation = math.atan(terrain.slope_at(self.x))

                self.state = "running"
                events["landed"] = True
                self.total_rotation = 0.0

        return events
