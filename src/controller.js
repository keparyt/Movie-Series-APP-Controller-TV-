const BUTTONS = Object.freeze({
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15
});

const KEY_BY_BUTTON = {
  [BUTTONS.UP]: 'ArrowUp', [BUTTONS.DOWN]: 'ArrowDown', [BUTTONS.LEFT]: 'ArrowLeft', [BUTTONS.RIGHT]: 'ArrowRight',
  [BUTTONS.A]: 'Enter', [BUTTONS.X]: 'Space', [BUTTONS.Y]: 'KeyF', [BUTTONS.LB]: 'PageUp', [BUTTONS.RB]: 'PageDown',
  [BUTTONS.SELECT]: 'Escape', [BUTTONS.START]: 'Enter', [BUTTONS.LS]: 'KeyM', [BUTTONS.RS]: 'KeyF'
};

let activePad = null;
let previous = [];
let lastAction = new Map();
let lastAxis = { x: 0, y: 0 };
let axisDirection = null;
let statusEl;
let controllerMode = false;

const BUTTON_REPEAT_MS = 280;
const AXIS_DEADZONE = 0.18;
const MOUSE_MAX_STEP = 9.5;
const MOUSE_ACCELERATION = 2.15;

function isPlayer() { return !!document.querySelector('.playerPage'); }
function isSearchField() { return !!document.activeElement?.matches?.('.search input'); }

function setControllerCursorHidden(hidden) {
  controllerMode = hidden;
  document.documentElement.classList.toggle('controller-active', hidden);
}

function emitControllerActivity(detail = {}) {
  window.dispatchEvent(new CustomEvent('controlleractivity', {
    detail: { controllerId: activePad?.id || 'Gamepad', ...detail }
  }));
}

function setStatus(text, ok = true) {
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'controller-status';
    Object.assign(statusEl.style, {
      position:'fixed', right:'18px', bottom:'18px', zIndex:'99999', padding:'9px 13px',
      borderRadius:'10px', font:'600 12px system-ui,sans-serif', color:'#eee',
      background:'rgba(10,11,14,.88)', border:'1px solid rgba(214,173,84,.35)',
      boxShadow:'0 8px 25px rgba(0,0,0,.35)', pointerEvents:'none', backdropFilter:'blur(12px)'
    });
    document.body.appendChild(statusEl);
  }
  statusEl.textContent = text;
  statusEl.style.borderColor = ok ? 'rgba(214,173,84,.55)' : 'rgba(255,100,100,.45)';
  statusEl.style.opacity = '1';
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { if (statusEl) statusEl.style.opacity = '.45'; }, 1800);
}

// Every interactive element in every page participates in the same controller
// navigation system. This deliberately includes episode cards, season buttons,
// search controls, details actions, history, My List, and the virtual keyboard.
function focusable() {
  return [...document.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
  )].filter(el => {
    const style = getComputedStyle(el);
    return el.offsetParent !== null && style.visibility !== 'hidden' && style.display !== 'none' && !el.closest('[aria-hidden="true"]');
  });
}

function ensureControllerFocus() {
  const els = focusable();
  if (!els.length) return null;
  const current = document.activeElement;
  if (current && els.includes(current)) return current;
  const preferred = els.find(el => el.matches('[data-controller-default], .primary, .active')) || els[0];
  preferred.focus({ preventScroll: true });
  preferred.scrollIntoView({ block:'nearest', inline:'nearest' });
  return preferred;
}

function moveFocus(direction) {
  const els = focusable();
  if (!els.length) return;

  const current = ensureControllerFocus();
  if (!current) return;

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
    // Favor elements in the requested direction, but still allow moving
    // between irregular grids such as episode lists and keyboard rows.
    const score = forward + side * 2.0;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' });
  }
}

function dispatchKey(key) {
  const target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, code:key, bubbles:true, cancelable:true }));
}

function movePlayerMouse(axisX, axisY) {
  const magnitude = Math.hypot(axisX, axisY);
  if (magnitude < 0.001) return;
  const normalized = Math.min(1, magnitude);
  const curved = Math.pow(normalized, MOUSE_ACCELERATION);
  const step = Math.min(MOUSE_MAX_STEP, 0.65 + (MOUSE_MAX_STEP - 0.65) * curved);
  const x = (axisX / magnitude) * step;
  const y = (axisY / magnitude) * step;
  window.electronAPI?.moveControllerMouse?.(x, y)?.catch?.(() => {});
}

function clickPlayerMouse() {
  window.electronAPI?.clickControllerMouse?.()?.catch?.(() => {});
}

function activateFocused() {
  const el = ensureControllerFocus();
  if (!el) return;

  // Search is a special controller interaction: A opens the on-screen keyboard
  // rather than submitting immediately.
  if (isSearchField()) {
    window.dispatchEvent(new CustomEvent('controllersearchactivate'));
    return;
  }

  if (typeof el.click === 'function') el.click();
  else dispatchKey('Enter');
}

function action(index) {
  emitControllerActivity({ button:index, key:KEY_BY_BUTTON[index] || null });

  // Any real controller action switches the application into controller mode.
  // The player is the only exception because it intentionally uses the real
  // Windows cursor for VidKing controls.
  if (!isPlayer()) setControllerCursorHidden(true);

  if (isPlayer()) {
    if (index === BUTTONS.A) return clickPlayerMouse();
    if (index === BUTTONS.B || index === BUTTONS.SELECT) return dispatchKey('Escape');
    return;
  }

  switch (index) {
    case BUTTONS.UP: return moveFocus('up');
    case BUTTONS.DOWN: return moveFocus('down');
    case BUTTONS.LEFT: return moveFocus('left');
    case BUTTONS.RIGHT: return moveFocus('right');
    case BUTTONS.B:
    case BUTTONS.SELECT:
      return dispatchKey('Escape');
    case BUTTONS.A:
      return activateFocused();
    case BUTTONS.START:
      return activateFocused();
    case BUTTONS.X:
    case BUTTONS.Y: {
      const el = ensureControllerFocus();
      if (el && typeof el.click === 'function') el.click();
      return;
    }
    default:
      return;
  }
}

function pressed(pad, index) {
  const b = pad.buttons[index];
  return !!b && (b.pressed || b.value > 0.5);
}

function shouldRepeat(index, now) {
  const last = lastAction.get(index) || 0;
  if (now - last < BUTTON_REPEAT_MS) return false;
  lastAction.set(index, now);
  return true;
}

function normalizeAxis(value) {
  if (Math.abs(value) <= AXIS_DEADZONE) return 0;
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - AXIS_DEADZONE) / (1 - AXIS_DEADZONE));
}

function poll() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  const pad = activePad && pads[activePad.index] ? pads[activePad.index] : pads.find(Boolean);

  if (pad && (!activePad || activePad.index !== pad.index)) {
    activePad = { index:pad.index, id:pad.id };
    previous = [];
    lastAction.clear();
    lastAxis = { x:0, y:0 };
    axisDirection = null;
    setStatus(`🎮 Controller connected · ${pad.id || 'Gamepad'}`);
    emitControllerActivity({ connected:true });
  }

  if (!pad) {
    if (activePad) setControllerCursorHidden(false);
    activePad = null;
    requestAnimationFrame(poll);
    return;
  }

  const now = performance.now();
  let touched = false;

  // Buttons: A/B/etc. activate once per press. D-pad is allowed to repeat.
  for (let i = 0; i < pad.buttons.length; i++) {
    const down = pressed(pad, i);
    const wasDown = !!previous[i];
    if (down) touched = true;

    const isDirectionalButton = [BUTTONS.UP, BUTTONS.DOWN, BUTTONS.LEFT, BUTTONS.RIGHT].includes(i);
    if (down && (!wasDown || isDirectionalButton) && shouldRepeat(i, now)) action(i);
    previous[i] = down;
  }

  const rawX = pad.axes?.[0] || 0;
  const rawY = pad.axes?.[1] || 0;
  const x = normalizeAxis(rawX);
  const y = normalizeAxis(rawY);
  if (x !== 0 || y !== 0) touched = true;

  // The player uses the analog stick as a real mouse. Everywhere else the
  // analog stick becomes universal spatial navigation with repeat behavior.
  if (isPlayer()) {
    movePlayerMouse(x, y);
    axisDirection = null;
  } else {
    const dir = Math.abs(x) >= Math.abs(y)
      ? (x < 0 ? 'left' : x > 0 ? 'right' : null)
      : (y < 0 ? 'up' : y > 0 ? 'down' : null);

    if (!dir) {
      axisDirection = null;
    } else {
      if (dir !== axisDirection || shouldRepeat(`axis-${dir}`, now)) {
        moveFocus(dir);
        axisDirection = dir;
      }
    }
  }

  lastAxis = { x:x === 0 ? 0 : Math.sign(x), y:y === 0 ? 0 : Math.sign(y) };

  // Crucially, any touched button OR stick immediately hides the cursor on
  // every normal page, including details, search, history, My List, seasons,
  // episodes, and the virtual keyboard.
  if (touched && !isPlayer()) setControllerCursorHidden(true);

  requestAnimationFrame(poll);
}

window.addEventListener('gamepadconnected', event => {
  activePad = { index:event.gamepad.index, id:event.gamepad.id };
  previous = [];
  lastAction.clear();
  lastAxis = { x:0, y:0 };
  axisDirection = null;
  setStatus(`🎮 Controller detected · ${event.gamepad.id || 'Gamepad'}`);
  emitControllerActivity({ connected:true });
});

window.addEventListener('gamepaddisconnected', event => {
  if (!activePad || activePad.index === event.gamepad.index) {
    activePad = null;
    setControllerCursorHidden(false);
    setStatus('🎮 Controller disconnected', false);
    window.dispatchEvent(new CustomEvent('controllerdisconnected'));
  }
});

// Physical mouse movement returns control to the mouse on normal pages.
window.addEventListener('mousemove', () => {
  if (controllerMode && !isPlayer()) setControllerCursorHidden(false);
}, { passive:true });

// Physical keyboard arrows are also routed through the same spatial navigation
// so switching between keyboard and controller never leaves focus in a bad state.
window.addEventListener('keydown', event => {
  if (event.key === 'Tab') return;
  if (!isPlayer() && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault();
    moveFocus(event.key.slice(5).toLowerCase());
  }
});

setStatus('🎮 Looking for controller…');
requestAnimationFrame(poll);
