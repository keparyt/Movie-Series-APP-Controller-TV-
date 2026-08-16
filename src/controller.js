const BUTTONS = Object.freeze({
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  LS: 10,
  RS: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15
});

const KEY_BY_BUTTON = {
  [BUTTONS.UP]: 'ArrowUp',
  [BUTTONS.DOWN]: 'ArrowDown',
  [BUTTONS.LEFT]: 'ArrowLeft',
  [BUTTONS.RIGHT]: 'ArrowRight',
  [BUTTONS.A]: 'Enter',
  [BUTTONS.X]: 'Space',
  [BUTTONS.Y]: 'KeyF',
  [BUTTONS.LB]: 'PageUp',
  [BUTTONS.RB]: 'PageDown',
  [BUTTONS.SELECT]: 'Escape',
  [BUTTONS.START]: 'Enter',
  [BUTTONS.LS]: 'KeyM',
  [BUTTONS.RS]: 'KeyF'
};

let activePad = null;
let previous = [];
let lastAction = new Map();
let lastAxis = { x: 0, y: 0 };
let statusEl;

function isPlayer() {
  return !!document.querySelector('.playerPage');
}

function setStatus(text, ok = true) {
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'controller-status';
    Object.assign(statusEl.style, {
      position: 'fixed', right: '18px', bottom: '18px', zIndex: '99999',
      padding: '9px 13px', borderRadius: '10px', font: '600 12px system-ui,sans-serif',
      color: '#eee', background: 'rgba(10,11,14,.88)', border: '1px solid rgba(214,173,84,.35)',
      boxShadow: '0 8px 25px rgba(0,0,0,.35)', pointerEvents: 'none', backdropFilter: 'blur(12px)'
    });
    document.body.appendChild(statusEl);
  }
  statusEl.textContent = text;
  statusEl.style.borderColor = ok ? 'rgba(214,173,84,.55)' : 'rgba(255,100,100,.45)';
  statusEl.style.opacity = '1';
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { if (statusEl) statusEl.style.opacity = '.45'; }, 1800);
}

function focusable() {
  return [...document.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')]
    .filter(el => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'));
}

function moveFocus(direction) {
  const els = focusable();
  const current = document.activeElement;
  if (!current || !els.includes(current)) {
    (els[0] || document.body).focus?.();
    return;
  }
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of els) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const bx = r.left + r.width / 2;
    const by = r.top + r.height / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const forward = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
    if (forward <= 8) continue;
    const side = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = forward + side * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function dispatchKey(key) {
  const target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
}

function sendPlayerKey(key) {
  if (window.electronAPI?.sendControllerKey) {
    window.electronAPI.sendControllerKey(key).catch?.(() => {});
  } else {
    dispatchKey(key);
  }
}

function action(index) {
  const key = KEY_BY_BUTTON[index];
  if (!key) return;

  if (index === BUTTONS.B || index === BUTTONS.SELECT) {
    // B/Back always belongs to the application so it can leave the player.
    dispatchKey('Escape');
    return;
  }

  if (isPlayer()) {
    sendPlayerKey(key);
    return;
  }

  if (index === BUTTONS.UP) return moveFocus('up');
  if (index === BUTTONS.DOWN) return moveFocus('down');
  if (index === BUTTONS.LEFT) return moveFocus('left');
  if (index === BUTTONS.RIGHT) return moveFocus('right');
  if (index === BUTTONS.A || index === BUTTONS.X || index === BUTTONS.Y || index === BUTTONS.START) {
    const el = document.activeElement;
    if (el && typeof el.click === 'function') el.click();
  }
}

function pressed(pad, index) {
  const b = pad.buttons[index];
  return !!b && (b.pressed || b.value > 0.5);
}

function shouldRepeat(index, now) {
  const last = lastAction.get(index) || 0;
  if (now - last < 170) return false;
  lastAction.set(index, now);
  return true;
}

function poll() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  const pad = activePad && pads[activePad.index] ? pads[activePad.index] : pads.find(Boolean);
  if (pad && (!activePad || activePad.index !== pad.index)) {
    activePad = { index: pad.index, id: pad.id };
    previous = [];
    setStatus(`🎮 Controller connected · ${pad.id || 'Gamepad'}`);
  }
  if (!pad) {
    activePad = null;
    requestAnimationFrame(poll);
    return;
  }

  const now = performance.now();
  for (let i = 0; i < pad.buttons.length; i++) {
    const down = pressed(pad, i);
    const wasDown = !!previous[i];
    if (down && (!wasDown || [12,13,14,15].includes(i))) {
      if (shouldRepeat(i, now)) action(i);
    }
    previous[i] = down;
  }

  const x = Math.abs(pad.axes?.[0] || 0) > 0.42 ? Math.sign(pad.axes[0]) : 0;
  const y = Math.abs(pad.axes?.[1] || 0) > 0.42 ? Math.sign(pad.axes[1]) : 0;
  if (x !== lastAxis.x) { if (x < 0) action(BUTTONS.LEFT); if (x > 0) action(BUTTONS.RIGHT); }
  if (y !== lastAxis.y) { if (y < 0) action(BUTTONS.UP); if (y > 0) action(BUTTONS.DOWN); }
  lastAxis = { x, y };

  requestAnimationFrame(poll);
}

window.addEventListener('gamepadconnected', event => {
  activePad = { index: event.gamepad.index, id: event.gamepad.id };
  previous = [];
  setStatus(`🎮 Controller detected · ${event.gamepad.id || 'Gamepad'}`);
});

window.addEventListener('gamepaddisconnected', event => {
  if (!activePad || activePad.index === event.gamepad.index) {
    activePad = null;
    setStatus('🎮 Controller disconnected', false);
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'Tab') return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key) && !isPlayer()) {
    // Keep keyboard/controller navigation consistent.
    moveFocus(event.key.slice(5).toLowerCase());
  }
});

setStatus('🎮 Looking for controller…');
requestAnimationFrame(poll);
