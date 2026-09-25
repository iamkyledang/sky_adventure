/** HUD (distance/coins/score/progress bar), trick popups, and overlays. */
export class GameUI {
  constructor() {
    this.distanceEl = document.getElementById('distance');
    this.coinsEl = document.getElementById('coins');
    this.scoreEl = document.getElementById('score');
    this.progressFillEl = document.getElementById('progress-fill');
    this.popupContainer = document.getElementById('popups');

    this.startOverlay = document.getElementById('start-overlay');
    this.winOverlay = document.getElementById('win-overlay');
    this.crashOverlay = document.getElementById('crash-overlay');
    this.winStatsEl = document.getElementById('win-stats');
    this.crashStatsEl = document.getElementById('crash-stats');
    this.startBtn = document.getElementById('start-btn');
    this.retryBtn = document.getElementById('retry-btn');
    this.retryFromCrashBtn = document.getElementById('retry-crash-btn');

    this.distance = 0;
    this.coins = 0;
    this.score = 0;
  }

  reset() {
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.updateHUD(0);
  }

  updateHUD(progress) {
    this.distanceEl.textContent = `${Math.max(0, Math.floor(this.distance))} m`;
    this.coinsEl.textContent = `${this.coins}`;
    this.scoreEl.textContent = `${Math.floor(this.score)}`;
    this.progressFillEl.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
  }

  addCoin() {
    this.coins += 1;
    this.score += 10;
  }

  addTrickBonus(amount, label) {
    this.score += amount;
    this.showPopup(`${label} +${amount}`);
  }

  showPopup(text) {
    const el = document.createElement('div');
    el.className = 'trick-popup';
    el.textContent = text;
    this.popupContainer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  showStart(onStart) {
    this.startOverlay.classList.remove('hidden');
    const handler = () => {
      this.startOverlay.classList.add('hidden');
      onStart();
    };
    this.startBtn.addEventListener('click', handler, { once: true });
  }

  showWin(onRestart) {
    this.score += Math.floor(this.distance);
    this.winStatsEl.textContent = `Distance: ${Math.floor(this.distance)} m · Coins: ${this.coins} · Score: ${Math.floor(this.score)}`;
    this.winOverlay.classList.remove('hidden');
    const handler = () => {
      this.winOverlay.classList.add('hidden');
      onRestart();
    };
    this.retryBtn.addEventListener('click', handler, { once: true });
  }

  showCrash(onRestart) {
    this.crashStatsEl.textContent = `Distance: ${Math.floor(this.distance)} m · Coins: ${this.coins} · Score: ${Math.floor(this.score)}`;
    this.crashOverlay.classList.remove('hidden');
    const handler = () => {
      this.crashOverlay.classList.add('hidden');
      onRestart();
    };
    this.retryFromCrashBtn.addEventListener('click', handler, { once: true });
  }

  hideAllOverlays() {
    this.startOverlay.classList.add('hidden');
    this.winOverlay.classList.add('hidden');
    this.crashOverlay.classList.add('hidden');
  }
}
