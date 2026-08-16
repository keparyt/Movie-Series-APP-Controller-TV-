const BUTTONS = Object.freeze({
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15
});

const KEY_BY_BUTTON = {
  [BUTTONS.UP]: 'ArrowUp', [BUTTONS.DOWN]: 'ArrowDown', [BUTTONS.LEFT]: 'ArrowLeft', [BUTTONS.RIGHT]: 'ArrowRight',
  [BUTTONS.A]: 'Enter', [BUTTONS.X]: 'Space', [BUTTONS.Y]: 'KeyF', [BUTTONS.LB]: 'PageUp', [BUTTONS.RB]: 'PageDown',
  [BUTTONS.SELECT]: 'Escape', [BUTTONS.START]: 'Enter', [BUTTONS.LS]: 'KeyM', [BUTTONS.RS]: 'KeyF'
};

let activePad = null, previous = [], lastAction = new Map(), lastAxis = { x: 0, y: 0 }, statusEl;
let controllerMode = false;

const BUTTON_REPEAT_MS = 280;
const AXIS_DEADZONE = 0.24;
const MOUSE_SPEED = 3.2;
const MOUSE_MAX_STEP = 5;

function isPlayer() { return !!document.querySelector('.playerPage'); }
function isSearchField() { return !!document.activeElement?.matches?.('.search input'); }

function setControllerCursorHidden(hidden) {
  controllerMode = hidden;
  document.documentElement.classList.toggle('controller-active', hidden);
}

function emitControllerActivity(detail = {}) {
  window.dispatchEvent(new CustomEvent('controlleractivity', { detail: { controllerId: activePad?.id || 'Gamepad', ...detail } }));
}

function setStatus(text, ok = true) {
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'controller-status';
    Object.assign(statusEl.style, { position:'fixed', right:'18px', bottom:'18px', zIndex:'99999', padding:'9px 13px', borderRadius:'10px', font:'600 12px system-ui,sans-serif', color:'#eee', background:'rgba(10,11,14,.88)', border:'1px solid rgba(214,173,84,.35)', boxShadow:'0 8px 25px rgba(0,0,0,.35)', pointerEvents:'none', backdropFilter:'blur(12px)' });
    document.body.appendChild(statusEl);
  }
  statusEl.textContent = text;
  statusEl.style.borderColor = ok ? 'rgba(214,173,84,.55)' : 'rgba(255,100,100,.45)';
  statusEl.style.opacity = '1';
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { if (statusEl) statusEl.style.opacity = '.45'; }, 1800);
}

function focusable() {
  return [...document.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'));
}

function moveFocus(direction) {
  const els = focusable(), current = document.activeElement;
  if (!current || !els.includes(current)) { (els[0] || document.body).focus?.(); return; }
  const a = current.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of els) {
    if (el === current) continue;
    const r = el.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const dx = bx - ax, dy = by - ay;
    const forward = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
    if (forward <= 8) continue;
    const side = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = forward + side * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block:'nearest', inline:'nearest' }); }
}

function dispatchKey(key) {
  const target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, code:key, bubbles:true, cancelable:true }));
}

function movePlayerMouse(axisX, axisY) {
  const magnitude = Math.hypot(axisX, axisY);
  if (magnitude < 0.01) return;
  const normalized = Math.min(1, magnitude);
  const curved = Math.pow(normalized, 1.7);
  const step = Math.min(MOUSE_MAX_STEP, MOUSE_SPEED * curved);
  const x = (axisX / magnitude) * step;
  const y = (axisY / magnitude) * step;
  window.electronAPI?.moveControllerMouse?.(x, y)?.catch?.(() => {});
}

function clickPlayerMouse() { window.electronAPI?.clickControllerMouse?.()?.catch?.(() => {}); }

function action(index) {
  emitControllerActivity({ button:index, key:KEY_BY_BUTTON[index] || null });
  // Normal app navigation is controller-first. The player deliberately keeps
  // the real cursor visible because the left stick controls the player cursor.
  if (!isPlayer()) setControllerCursorHidden(true);

  if (isPlayer()) {
    if (index === BUTTONS.A) return clickPlayerMouse();
    if (index === BUTTONS.B) return dispatchKey('Escape');
    if (index === BUTTONS.SELECT) return dispatchKey('Escape');
    return;
  }

  const key = KEY_BY_BUTTON[index];
  if (!key) return;
  if (index === BUTTONS.A && isSearchField()) {
    window.dispatchEvent(new CustomEvent('controllersearchactivate'));
    return;
  }
  if (index === BUTTONS.B || index === BUTTONS.SELECT) { dispatchKey('Escape'); return; }
  if (index === BUTTONS.UP) return moveFocus('up');
  if (index === BUTTONS.DOWN) return moveFocus('down');
  if (index === BUTTONS.LEFT) return moveFocus('left');
  if (index === BUTTONS.RIGHT) return moveFocus('right');
  if ([BUTTONS.A, BUTTONS.X, BUTTONS.Y, BUTTONS.START].includes(index)) {
    const el = document.activeElement;
    if (el && typeof el.click === 'function') el.click();
  }
}

function pressed(pad, index) { const b = pad.buttons[index]; return !!b && (b.pressed || b.value > 0.5); }
function shouldRepeat(index, now) {
  const last = lastAction.get(index) || 0;
  if (now - last < BUTTON_REPEAT_MS) return false;
  lastAction.set(index, now);
  return true;
}

function poll() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  const pad = activePad && pads[activePad.index] ? pads[activePad.index] : pads.find(Boolean);

  if (pad && (!activePad || activePad.index !== pad.index)) {
    activePad = { index:pad.index, id:pad.id };
    previous = [];
    lastAction.clear();
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

  for (let i = 0; i < pad.buttons.length; i++) {
    const down = pressed(pad, i), wasDown = !!previous[i];
    if (down) touched = true;
    if (down && (!wasDown || [12,13,14,15].includes(i)) && shouldRepeat(i, now)) action(i);
    previous[i] = down;
  }

  const rawX = pad.axes?.[0] || 0;
  const rawY = pad.axes?.[1] || 0;
  const x = Math.abs(rawX) > AXIS_DEADZONE ? Math.sign(rawX) * ((Math.abs(rawX) - AXIS_DEADZONE) / (1 - AXIS_DEADZONE)) : 0;
  const y = Math.abs(rawY) > AXIS_DEADZONE ? Math.sign(rawY) * ((Math.abs(rawY) - AXIS_DEADZONE) / (1 - AXIS_DEADZONE)) : 0;
  if (x !== 0 || y !== 0) touched = true;

  // Do not hide the cursor merely because a controller is connected. The first
  // real button/axis input is what switches the normal app into controller mode.
  // The player is excluded because its left stick intentionally controls the
  // visible Windows cursor.
  if (touched && !isPlayer()) setControllerCursorHidden(true);

  if (isPlayer()) {
    movePlayerMouse(x, y);
  } else {
    if (x !== 0 && lastAxis.x === 0) action(x < 0 ? BUTTONS.LEFT : BUTTONS.RIGHT);
    if (y !== 0 && lastAxis.y === 0) action(y < 0 ? BUTTONS.UP : BUTTONS.DOWN);
  }
  lastAxis = { x: x === 0 ? 0 : Math.sign(x), y: y === 0 ? 0 : Math.sign(y) };

  requestAnimationFrame(poll);
}

window.addEventListener('gamepadconnected', event => {
  activePad = { index:event.gamepad.index, id:event.gamepad.id };
  previous = [];
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

// Real mouse movement returns the pointer to normal desktop behavior on the
// regular app. The player intentionally keeps the pointer visible.
window.addEventListener('mousemove', () => {
  if (controllerMode && !isPlayer()) setControllerCursorHidden(false);
}, { passive:true });

window.addEventListener('keydown', event => {
  if (event.key === 'Tab') return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key) && !isPlayer()) moveFocus(event.key.slice(5).toLowerCase());
});

setStatus('🎮 Looking for controller…');
requestAnimationFrame(poll);
