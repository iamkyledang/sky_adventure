/**
 * Bridges JavaScript to a Python game engine running fully client-side via
 * Pyodide (CPython compiled to WebAssembly). Pyodide is loaded at runtime
 * from a CDN - this keeps the deployed site 100% static (no server, no
 * build-time Python dependency) while letting the actual game logic
 * (public/py/*.py) run as real Python in the browser.
 *
 * JS never touches Python objects directly: every call here returns a JSON
 * string from Python that gets parsed into a plain JS value, so there is no
 * PyProxy memory management to worry about.
 */
const PYODIDE_VERSION = '0.28.3';
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PY_FILES = ['terrain.py', 'player.py', 'game.py'];

let gameModule = null;
let readyPromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/** Loads Pyodide + the game's .py source files. Safe to call once; repeat calls reuse the same promise. */
export function initPyodide(onProgress = () => {}) {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    onProgress('Loading Python engine…');
    await loadScriptOnce(`${PYODIDE_CDN_BASE}pyodide.js`);
    const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN_BASE });

    onProgress('Loading game code…');
    const base = import.meta.env.BASE_URL;
    pyodide.FS.mkdirTree('/py');
    for (const file of PY_FILES) {
      const res = await fetch(`${base}py/${file}`);
      if (!res.ok) throw new Error(`Failed to fetch ${file} (${res.status})`);
      pyodide.FS.writeFile(`/py/${file}`, await res.text());
    }

    pyodide.runPython(
      'import sys\n' + 'if "/py" not in sys.path:\n' + '    sys.path.insert(0, "/py")\n' + 'import game',
    );
    gameModule = pyodide.pyimport('game');

    return pyodide;
  })();

  return readyPromise;
}

export function getCourseData() {
  return JSON.parse(gameModule.get_course_data());
}

export function resetGame() {
  return JSON.parse(gameModule.reset());
}

export function startCharge() {
  gameModule.start_charge();
}

export function releaseCharge() {
  gameModule.release_charge();
}

export function step(dt) {
  return JSON.parse(gameModule.step(dt));
}
