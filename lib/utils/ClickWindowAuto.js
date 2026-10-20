'use strict';

/**
 * ClickWindowAuto (P2910) — decides, per device and per button, whether the app-level click
 * window (ClickAggregator, P2798) is needed.
 *
 * Rule (dlnraja Spec Kit 2026-10-03): the double/triple window is switched on automatically ONLY
 * when it is needed, so a plain single press keeps firing immediately everywhere else.
 *   1. An explicit `click_window_ms` > 0 always wins (user choice, clamped 150–2000 ms).
 *   2. Otherwise the window is auto-enabled only when ALL of these hold:
 *      - the exact mfr+pid carries the `onoff_commands_single` firmware quirk (one command per press),
 *      - at least one Flow uses a double / triple card for this device and this button,
 *      - the remote has not shown native multi-press frames (0xFD / E000) — then firmware counts.
 *   3. Else 0 = off: every press is an immediate single (unchanged behaviour).
 *
 * Flow usage comes from FlowCardTriggerDevice.getArgumentValues(device) (Homey SDK v3), cached
 * 60 s and invalidated on the card 'update' event. Never throws; on any doubt it returns 0.
 */
const { clampWindow } = require('./ClickAggregator');

const AUTO_WINDOW_MS = 600;
const CACHE_MS = 60000;
const MAX_BUTTONS = 8;

/** Pure decision helper (unit-tested). */
function effectiveWindow({ explicitMs, quirk, needed, nativeMulti, autoMs } = {}) {
  const ex = clampWindow(explicitMs);
  if (ex) {return ex;}
  if (quirk && needed && !nativeMulti) {return clampWindow(autoMs || AUTO_WINDOW_MS);}
  return 0;
}

/**
 * Double / triple trigger card ids for one button of a button_wireless_N style compose.
 * `generic` cards carry a `button` dropdown argument; `perButton` cards do not.
 */
function multiCardIds(driverId, gangs) {
  const d = String(driverId || '');
  const g = Math.max(1, Math.min(MAX_BUTTONS, Number(gangs) || 1));
  const generic = [`${d}_button_${g}gang_button_double_press`, `${d}_button_${g}gang_button_multi_press`];
  const perButton = {};
  for (let b = 1; b <= g; b++) {
    perButton[b] = [`${d}_button_${g}gang_button_${b}_double`, `${d}_button_${g}gang_button_${b}_triple`];
  }
  return { generic, perButton };
}

/** Which buttons are wanted by a list of argument values of a generic card (button dropdown). */
function buttonsFromArgs(values, gangs) {
  const out = new Set();
  for (const a of Array.isArray(values) ? values : []) {
    const raw = a && (a.button && typeof a.button === 'object' ? a.button.id : a.button);
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= gangs) {out.add(n);} else {for (let b = 1; b <= gangs; b++) {out.add(b);}}
  }
  return out;
}

class ClickWindowAuto {
  constructor(device, { gangs = 4 } = {}) {
    this.device = device;
    this.gangs = Math.max(1, Math.min(MAX_BUTTONS, Number(gangs) || 1));
    this.needed = new Set();
    this.at = 0;
    this.pending = null;
    this.hooks = [];
    this.destroyed = false;
  }

  _card(id) {
    try {
      const flow = this.device?.homey?.flow;
      return flow && typeof flow.getDeviceTriggerCard === 'function' ? flow.getDeviceTriggerCard(id) : null;
    } catch (_e) { return null; }
  }

  _hook(card) {
    if (!card || typeof card.on !== 'function' || this.hooks.some((h) => h.card === card)) {return;}
    const fn = () => { this.at = 0; };
    try { card.on('update', fn); this.hooks.push({ card, fn }); } catch (_e) { /* soft */ }
  }

  async _values(id) {
    const card = this._card(id);
    if (!card || typeof card.getArgumentValues !== 'function') {return [];}
    this._hook(card);
    try {
      const v = await card.getArgumentValues(this.device);
      return Array.isArray(v) ? v : [];
    } catch (_e) { return []; }
  }

  /** Refresh the cached set of buttons that have a double/triple Flow. */
  async refresh() {
    if (this.destroyed) {return this.needed;}
    if (this.pending) {return this.pending;}
    this.pending = (async () => {
      const next = new Set();
      try {
        const { generic, perButton } = multiCardIds(this.device?.driver?.id, this.gangs);
        for (const id of generic) {
          // eslint-disable-next-line no-await-in-loop
          for (const b of buttonsFromArgs(await this._values(id), this.gangs)) {next.add(b);}
        }
        for (const [b, ids] of Object.entries(perButton)) {
          for (const id of ids) {
            // eslint-disable-next-line no-await-in-loop
            if ((await this._values(id)).length) { next.add(Number(b)); break; }
          }
        }
      } catch (_e) { /* soft */ }
      this.needed = next;
      this.at = Date.now();
      this.pending = null;
      return next;
    })();
    return this.pending;
  }

  /** Synchronous view (cached); schedules a refresh when stale. */
  isNeeded(button) {
    if (!this.at || Date.now() - this.at > CACHE_MS) {Promise.resolve(this.refresh()).catch(() => {});}
    const b = Number(button);
    return Number.isInteger(b) ? this.needed.has(b) : this.needed.size > 0;
  }

  destroy() {
    this.destroyed = true;
    for (const { card, fn } of this.hooks) {
      try { (card.removeListener || card.off).call(card, 'update', fn); } catch (_e) { /* soft */ }
    }
    this.hooks = [];
    this.needed.clear();
  }
}

module.exports = { ClickWindowAuto, effectiveWindow, multiCardIds, buttonsFromArgs, AUTO_WINDOW_MS };
