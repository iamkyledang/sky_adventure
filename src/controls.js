/**
 * Single-input control scheme, Alto's-Adventure style:
 * - Press and hold (Space, click, or touch) while grounded to charge a jump;
 *   release to launch - longer hold = higher jump.
 * - Press while airborne to start a mid-air spin trick.
 *
 * This class only forwards input events; the actual jump/trick logic lives
 * in Python (public/py/player.py), reached via the onStart/onRelease callbacks.
 */
export class Controls {
  constructor(target, { onStart, onRelease }) {
    this.target = target;
    this.onStart = onStart;
    this.onRelease = onRelease;

    this.onDown = (e) => {
      e.preventDefault();
      this.onStart();
    };
    this.onUp = (e) => {
      e.preventDefault();
      this.onRelease();
    };
    this.onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) this.onStart();
    };
    this.onKeyUp = (e) => {
      if (e.code === 'Space') this.onRelease();
    };

    target.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  dispose() {
    this.target.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
