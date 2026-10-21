'use strict';
/**
 * ButtonEventRouter (P2926) — one small place that turns every way a Tuya/Zigbee
 * button press can reach us into { button, type } and lets one press fire once.
 *
 * Paths: zcl_onoff (on/off/toggle), tuya_fd (onOff 0xFD), scene_recall (0x0005),
 * level_step (knobs), e000, e001, ef00_dp, raw, multistate, onoff_attr.
 *
 * Written in our own words. Ideas and value tables credited to:
 *  - Zigbee2MQTT tuya converters (Koenkk et al.) — 0xFD value 0/1/2 = single/double/hold,
 *    TS004F 0x8004 operation mode 0=command(dimmer) 1=event(scene),
 *    E001 0xD020 switch mode / 0xD030 switch type. https://github.com/Koenkk/zigbee-herdsman-converters
 *  - ZHA quirks (zigpy/zha-device-handlers, tuya TS004x) — drop a frame repeating the same
 *    transaction sequence number. https://github.com/zigpy/zha-device-handlers
 *  - deCONZ (dresden-elektronik) — scene recall id -> button event mapping.
 *  - Johan Bendz com.tuya.zigbee (SDK3 app) — per-endpoint onOff BoundCluster = gang.
 * Dedup base window 900 ms is the value our P2440 gate already used; Z2M debounce users
 * typically sit at 0.5-1 s and ZHA's TSN drop is window-free, so 400..1500 ms clamp (floor kept high so untagged legacy paths never lose dedup).
 *
 * Memory: every map is size-capped; no timers are created here.
 */

const PATHS = ['zcl_onoff', 'tuya_fd', 'scene_recall', 'level_step', 'e000', 'e001',
  'ef00_dp', 'raw', 'multistate', 'onoff_attr'];
const BASE_WINDOW_MS = 900;
const MIN_WINDOW_MS = 400;
const MAX_WINDOW_MS = 1500;
const LAT_RING = 16;
const UNKNOWN_RING = 20;
const MAX_KEYS = 64;

const FD_PRESS = { 0: 'single', 1: 'double', 2: 'long' };

function pressFromValue(v) {
  const n = Number(v);
  if (FD_PRESS[n]) { return FD_PRESS[n]; }
  const s = String(v || '').toLowerCase();
  if (/hold|long/.test(s)) { return 'long'; }
  if (/double/.test(s)) { return 'double'; }
  if (/triple/.test(s)) { return 'triple'; }
  if (/release/.test(s)) { return 'release'; }
  return 'single';
}

/* ---------- scene / operating mode interpretation ---------- */

/** TS004F 0x8004 on onOff: 0 = command (dimmer) mode, 1 = event (scene) mode. */
function modeFrom8004(v) {
  const n = Number(v);
  if (n === 1) { return 'scene'; }
  if (n === 0) { return 'command'; }
  return 'unknown';
}

/** E001 0xD020 switch mode (Z2M switchMode): 0 = command/normal, 1 = event/scene. */
function modeFromE001(v) { return modeFrom8004(v); }

/** Relay-decoupled detection (switches): E001 0xD030 or a 'relay_decoupled'/'switch_mode' DP. */
function isDecoupled(attrOrDp) {
  if (attrOrDp == null) { return false; }
  if (typeof attrOrDp === 'boolean') { return attrOrDp; }
  const s = String(attrOrDp).toLowerCase();
  return s === '1' || s === 'decoupled' || s === 'scene' || s === 'true';
}

/**
 * Scene id -> {button, type}. Multi-endpoint: endpoint = button, scene id low nibble
 * press (0/1/2). Single endpoint (deCONZ-style blocks): 1-16 single, 17-32 double,
 * 33-48 long, button = ((id-1) % 16) + 1. Optional explicit map overrides.
 */
function sceneToButton(sceneId, endpoint, endpointCount, map) {
  const id = Number(sceneId) || 0;
  if (map && map[id]) { return { button: Number(map[id].button) || 1, type: map[id].type || 'single' }; }
  if ((Number(endpointCount) || 1) > 1) {
    return { button: Number(endpoint) || 1, type: FD_PRESS[id % 3] || 'single' };
  }
  if (id <= 0) { return { button: 1, type: 'single' }; }
  const block = Math.floor((id - 1) / 16);
  return { button: ((id - 1) % 16) + 1, type: ['single', 'double', 'long'][block] || 'single' };
}

/* ---------- normalizers: (payload) -> {button,type} | null ---------- */

const normalize = {
  zcl_onoff({ endpoint, command, mode }) {
    const c = String(command || '').replace(/^command/i, '').toLowerCase();
    if (!['on', 'off', 'toggle'].includes(c)) { return null; }
    // In command mode TS004F 1-key sends on/off as "dimmer"; still a press.
    const type = mode === 'command' && c === 'off' ? 'double' : 'single';
    return { button: Number(endpoint) || 1, type };
  },
  tuya_fd({ endpoint, value }) {
    return { button: Number(endpoint) || 1, type: pressFromValue(value) };
  },
  scene_recall({ endpoint, sceneId, endpointCount, map }) {
    return sceneToButton(sceneId, endpoint, endpointCount, map);
  },
  level_step({ endpoint, command, stepMode }) {
    const c = String(command || '').toLowerCase();
    if (/stop/.test(c)) { return { button: Number(endpoint) || 1, type: 'release' }; }
    if (/move/.test(c)) { return { button: Number(endpoint) || 1, type: 'long' }; }
    const dir = Number(stepMode) === 1 ? 'rotate_left' : 'rotate_right';
    return { button: Number(endpoint) || 1, type: 'single', rotate: dir };
  },
  e000({ endpoint, value, commandId }) {
    return { button: Number(endpoint) || 1, type: pressFromValue(value ?? commandId) };
  },
  e001({ endpoint, value }) {
    return { button: Number(endpoint) || 1, type: pressFromValue(value) };
  },
  ef00_dp({ dp, value, dpMap }) {
    if (dpMap && dpMap[dp]) {
      const m = dpMap[dp];
      return { button: Number(m.button) || 1, type: m.type || pressFromValue(value) };
    }
    const d = Number(dp);
    // Common TS0601 scene switches: DP1..DP8 = button, value 0/1/2 = press.
    if (d >= 1 && d <= 8) { return { button: d, type: pressFromValue(value) }; }
    return null;
  },
  multistate({ endpoint, value }) {
    // genMultistateInput presentValue: 1 single, 2 double, 0 hold (Z2M legacy), 255 release.
    const n = Number(value);
    const t = n === 2 ? 'double' : n === 0 ? 'long' : n === 255 ? 'release' : n === 3 ? 'triple' : 'single';
    return { button: Number(endpoint) || 1, type: t };
  },
  onoff_attr({ endpoint }) {
    // Attribute-report-only remotes: any onOff flip on a pure remote endpoint = one press.
    return { button: Number(endpoint) || 1, type: 'single' };
  },
  raw({ endpoint, clusterId, commandId, payload }) {
    return heuristic({ endpoint, clusterId, commandId, payload });
  },
};

/** Heuristic for an unknown frame: button from endpoint, press from command id/first byte. */
function heuristic({ endpoint, commandId, payload }) {
  let v = null;
  if (payload && payload.length) { v = payload[payload.length === 1 ? 0 : 0]; }
  const t = v != null && FD_PRESS[v] ? FD_PRESS[v] : (FD_PRESS[Number(commandId)] || 'single');
  return { button: Number(endpoint) || 1, type: t, heuristic: true };
}

/* ---------- per-device router: dedup + learning + unknown capture ---------- */

class ButtonRouter {
  constructor(opts = {}) {
    this.fixedWindowMs = Number(opts.windowMs) > 0 ? Number(opts.windowMs) : null;
    this.now = opts.now || (() => Date.now());
    this._last = new Map(); // key -> {ts, path}
    this._lat = []; // cross-path latencies ms
    this.stats = {}; // path -> {n, ep:{}}
    this.unknown = [];
    this.mode = 'unknown';
    this.nativeMulti = {}; // type -> true when device sent it itself
  }

  /** Dynamic window: 2.5x p90 of observed cross-path latency, clamped. */
  windowMs() {
    if (this.fixedWindowMs) { return this.fixedWindowMs; }
    if (this._lat.length < 3) { return BASE_WINDOW_MS; }
    const s = [...this._lat].sort((a, b) => a - b);
    const p90 = s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
    return Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, Math.round(p90 * 2.5 + 100)));
  }

  _learn(path, ep) {
    const st = this.stats[path] || (this.stats[path] = { n: 0, ep: {} });
    st.n = Math.min(st.n + 1, 1e6);
    if (Object.keys(st.ep).length < 16 || st.ep[ep]) { st.ep[ep] = (st.ep[ep] || 0) + 1; }
  }

  /** Paths ordered by delivered presses (preferred first). Others stay listening. */
  preferredPaths() {
    return Object.entries(this.stats).sort((a, b) => b[1].n - a[1].n).map(([p]) => p);
  }

  /**
   * @returns {{admit:boolean, reason?:string, windowMs:number}}
   * Same path repeats always pass (double-click logic upstream owns them);
   * a different path with the same button+type inside the window is a copy.
   * A repeated transaction sequence number on any path is a copy (ZHA idea).
   */
  admit({ button, type, path = 'unknown', endpoint, seq }) {
    const now = this.now();
    const win = this.windowMs();
    if (path !== 'emulated' && (type === 'double' || type === 'triple' || type === 'long')) { this.nativeMulti[type] = true; }
    const key = `${button}:${type}`;
    const last = this._last.get(key);
    if (seq != null && last && last.seq === seq && now - last.ts < win) {
      return { admit: false, reason: 'same-seq', windowMs: win };
    }
    if (last && last.path !== path && now - last.ts < win) {
      const d = now - last.ts;
      this._lat.push(d); if (this._lat.length > LAT_RING) { this._lat.shift(); }
      return { admit: false, reason: `cross-path ${last.path}->${path} ${d}ms`, windowMs: win };
    }
    this._last.delete(key);
    this._last.set(key, { ts: now, path, seq });
    if (this._last.size > MAX_KEYS) { this._last.delete(this._last.keys().next().value); }
    this._learn(path, String(endpoint ?? button));
    return { admit: true, windowMs: win };
  }

  /** Emulate double/triple/long only when the device never sent them itself. */
  shouldEmulate(type) { return !this.nativeMulti[type]; }

  /**
   * DP cross-check per mfr/pid/firmware (bounded): remember which DPs a given
   * identity really uses, and report DPs the profile does not expect.
   * @returns {string|null} mismatch note
   */
  recordDp(dp, identity = {}, expected) {
    const fw = `${identity.mfr || '?'}/${identity.pid || '?'}/${identity.fw || '?'}`;
    this.dpSeen = this.dpSeen || {};
    const row = this.dpSeen[fw] || (this.dpSeen[fw] = {});
    if (Object.keys(this.dpSeen).length > 4) { delete this.dpSeen[Object.keys(this.dpSeen)[0]]; }
    if (Object.keys(row).length < 32 || row[dp]) { row[dp] = (row[dp] || 0) + 1; }
    if (Array.isArray(expected) && expected.length && !expected.map(Number).includes(Number(dp))) {
      return `DP${dp} not in profile [${expected.join(',')}] for ${fw}`;
    }
    return null;
  }

  captureUnknown(entry) {
    this.unknown.push({ ts: this.now(), ...entry });
    if (this.unknown.length > UNKNOWN_RING) { this.unknown.shift(); }
    return heuristic(entry);
  }

  snapshot() {
    return { windowMs: this.windowMs(), mode: this.mode, preferred: this.preferredPaths(),
      stats: this.stats, unknown: this.unknown.slice(-5) };
  }
}

const KEY = '_buttonEventRouter';
function routerFor(device, opts) {
  if (!device) { return null; }
  if (!device[KEY]) {
    try { device[KEY] = new ButtonRouter(opts); } catch (_e) { return null; }
  }
  return device[KEY];
}
function disposeRouter(device) { try { delete device[KEY]; } catch (_e) { /* soft */ } }

/** Infer the path label from the token bag that callers already pass. */
function pathOf(tokens = {}) {
  if (tokens.path) { return String(tokens.path); }
  if (tokens.rotate) { return 'level_step'; }
  return 'physical';
}

module.exports = {
  PATHS, BASE_WINDOW_MS, MIN_WINDOW_MS, MAX_WINDOW_MS,
  normalize, heuristic, pressFromValue, sceneToButton,
  modeFrom8004, modeFromE001, isDecoupled,
  ButtonRouter, routerFor, disposeRouter, pathOf,
};
