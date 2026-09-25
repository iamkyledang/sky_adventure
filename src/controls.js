/**
 * Single-input control scheme, Alto's-Adventure style:
 * - Press and hold (Space, click, or touch) while grounded to charge a jump;
 *   release to launch - longer hold = higher jump.
 * - Press while airborne to start a mid-air spin trick.
 */
export class Controls {
  constructor(target, player) {
    this.target = target;
    this.player = player;

    this.onDown = (e) => {
      e.preventDefault();
      this.player.startCharge();
    };
    this.onUp = (e) => {
      e.preventDefault();
      this.player.releaseCharge();
    };
    this.onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) this.player.startCharge();
    };
    this.onKeyUp = (e) => {
      if (e.code === 'Space') this.player.releaseCharge();
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
