#!/usr/bin/env node
'use strict';
/*
 * P3040: pairing / first-start trace. Runs a driver's real onNodeInit in a Homey-less harness
 * with a fake zclNode and a virtual clock, and records every radio-bound call (reads, binds,
 * configureReporting, Tuya EF00 commands) with its virtual time. Nothing leaves the process.
 *
 * Usage: node scripts/perf/pairing-trace.js [driverId ...] [--horizon 120] [--json]
 * Output per driver: init time (await onNodeInit, virtual ms), TX count in the first 2 s,
 * peak TX in any 1 s window, total TX until the horizon, and errors.
 */
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const horizonS = Number(args[args.indexOf('--horizon') + 1] || 0) || 120;
const asJson = args.includes('--json');

// ---------- virtual clock ----------
let now = 0;
let seq = 0;
const timers = new Map();
function vSet(fn, ms, repeat) {
  const id = ++seq;
  const delay = Math.max(0, Number(ms) || 0);
  timers.set(id, { at: now + delay, fn, repeat: repeat ? Math.max(1, delay) : 0 });
  return { id, unref() { return this; }, ref() { return this; }, hasRef() { return false; }, [Symbol.toPrimitive]() { return id; } };
}
function vClear(t) { if (t == null) {return;} timers.delete(typeof t === 'object' ? t.id : Number(t)); }
const realSetImmediate = setImmediate;
const flush = async (n = 30) => { for (let i = 0; i < n; i++) {await new Promise((r) => realSetImmediate(r));} };
const realDateNow = Date.now;
// reproducible jitter: seeded PRNG (mulberry32) instead of Math.random, reset per driver
let seed = 3040;
function seededRandom() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
Math.random = seededRandom;
const base = realDateNow();

// ---------- trace ----------
let trace = [];
const withStack = args.includes('--stack');
function caller() {
  const lines = String(new Error().stack).split('\n').slice(3).filter((l) => l.includes(ROOT) && !l.includes('pairing-trace.js'));
  return lines.slice(0, 3).map((l) => l.replace(/^.*?\(?\/.*?(lib|drivers)\//, '$1/').replace(/\)$/, '').trim()).join(' < ');
}
const rec = (kind, detail) => trace.push({ t: now, kind, detail, at: withStack ? caller() : undefined });

const EMITTER = new Set(['on', 'once', 'off', 'emit', 'addListener', 'removeListener', 'removeAllListeners', 'prependListener',
  'prependOnceListener', 'listeners', 'rawListeners', 'listenerCount', 'eventNames', 'getMaxListeners', 'setMaxListeners']);
function fakeCluster(name, epId) {
  const handler = {
    get(target, prop) {
      if (prop in target) {return target[prop];}
      if (prop === 'then' || typeof prop === 'symbol') {return undefined;}
      if (prop === 'name') {return name;}
      if (EMITTER.has(prop)) {return () => prop === 'listenerCount' || prop === 'getMaxListeners' ? 0 : undefined;}
      if (prop === 'readAttributes') {return async (attrs) => {
        rec('read', `${epId}:${name}:${[].concat(attrs).join(',')}`);
        // basic answers like a real Tuya chip (values are placeholders); other clusters answer empty
        return name === 'basic' ? Object.fromEntries([].concat(attrs).map((a) => [a, 1])) : {};
      };}
      if (prop === 'bind') {return async () => { rec('bind', `${epId}:${name}`); };}
      if (prop === 'configureReporting') {return async (cfg) => { rec('report', `${epId}:${name}:${Object.keys(cfg || {}).join(',')}`); };}
      if (prop === 'writeAttributes') {return async (a) => { rec('write', `${epId}:${name}:${Object.keys(a || {}).join(',')}`); };}
      if (prop === 'discoverCommandsReceived' || prop === 'discoverAttributes' || prop === 'discoverAttributesExtended' || prop === 'discoverCommandsGenerated') {
        return async () => { rec('discover', `${epId}:${name}:${prop}`); return []; };
      }
      return async () => { rec('cmd', `${epId}:${name}:${String(prop)}`); return {}; };
    },
  };
  return new Proxy({ NAME: name, ID: 0 }, handler);
}

function fakeNode(spec) {
  const endpoints = {};
  for (const [ep, clusters] of Object.entries(spec.endpoints)) {
    const cl = {};
    for (const c of clusters) {cl[c] = fakeCluster(c, ep);}
    endpoints[ep] = { clusters: cl, bindings: {}, bind() {}, ID: Number(ep) };
  }
  return {
    endpoints,
    on() {}, off() {}, removeListener() {},
    sendFrame: async (ep, cid) => rec('frame', `${ep}:0x${Number(cid).toString(16)}`),
    handleFrame() {},
  };
}

// ---------- homey stub ----------
function makeHomey() {
  const settings = new Map();
  return {
    __: (k) => typeof k === 'string' ? k : (k && (k.en || Object.values(k)[0])) || '',
    setTimeout: (fn, ms) => vSet(fn, ms, false),
    clearTimeout: vClear,
    setInterval: (fn, ms) => vSet(fn, ms, true),
    clearInterval: vClear,
    setImmediate: (fn) => vSet(fn, 0, false),
    settings: { get: (k) => settings.get(k), set: (k, v) => settings.set(k, v), unset: (k) => settings.delete(k), on() {}, getKeys: () => [...settings.keys()] },
    notifications: { createNotification: async (n) => { rec('notify', String(n && n.excerpt).slice(0, 120)); } },
    flow: new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => ({ registerRunListener() { return this; }, registerArgumentAutocompleteListener() { return this; }, trigger: async () => {}, on() {} }) }) }),
    app: {},
    on() {}, off() {}, removeListener() {},
    api: { realtime() {} },
    i18n: { getLanguage: () => 'en' },
    clock: { getTimezone: () => 'Europe/Paris' },
    version: '12.4.0', platform: 'local', platformVersion: 2,
    zigbee: { getNode: async () => { throw new Error('harness'); } },
    energy: {}, insights: { createLog: async () => ({}), getLog: async () => ({}) },
    drivers: { getDriver: () => ({ getDevices: () => [] }), getDrivers: () => ({}) },
  };
}

let currentDriverId = '';
class DeviceStub {
  constructor() {
    this.homey = makeHomey();
    this._caps = [];
    this._capVals = {};
    this._store = {};
    this._settings = {};
    this._data = { id: 'trace-device', token: 'x' };
    this.driver = { id: currentDriverId, manifest: {}, getDevices: () => [], ready: async () => {} };
  }
  log() {} error() {}
  getName() { return 'trace'; }
  getData() { return this._data; }
  getAppId() { return 'com.dlnraja.tuya.zigbee'; }
  getStore() { return this._store; }
  getStoreValue(k) { return this._store[k]; }
  async setStoreValue(k, v) { this._store[k] = v; }
  async unsetStoreValue(k) { delete this._store[k]; }
  getStoreKeys() { return Object.keys(this._store); }
  getSettings() { return this._settings; }
  getSetting(k) { return this._settings[k]; }
  async setSettings(o) { Object.assign(this._settings, o); }
  getCapabilities() { return this._caps.slice(); }
  hasCapability(c) { return this._caps.includes(c); }
  async addCapability(c) { if (!this._caps.includes(c)) { this._caps.push(c); rec('cap+', c); } }
  async removeCapability(c) { const i = this._caps.indexOf(c); if (i >= 0) { this._caps.splice(i, 1); rec('cap-', c); } }
  getCapabilityValue(c) { return this._capVals[c] ?? null; }
  async setCapabilityValue(c, v) { this._capVals[c] = v; }
  async setCapabilityOptions() {}
  getCapabilityOptions() { return {}; }
  registerCapabilityListener() {}
  registerMultipleCapabilityListener() {}
  async setAvailable() {} async setUnavailable() {} async setWarning() {} async unsetWarning() {}
  getAvailable() { return true; }
  getClass() { return 'sensor'; }
  async setClass() {}
  getEnergy() { return {}; } async setEnergy() {}
  async ready() {}
  get manifest() { return {}; }
}
const homeyModule = new Proxy({ App: DeviceStub, Driver: DeviceStub, Device: DeviceStub, SimpleClass: DeviceStub, __: (k) => k }, {
  get: (t, p) => p in t ? t[p] : DeviceStub,
});
const origLoad = Module._load;
Module._load = function harnessLoad(request, parent, isMain) {
  if (request === 'homey') {return homeyModule;}
  return origLoad.call(this, request, parent, isMain);
};
// Make global timers virtual too (some modules use them directly). Date.now follows the clock.
global.setTimeout = (fn, ms, ...a) => vSet(() => fn(...a), ms, false);
global.setInterval = (fn, ms, ...a) => vSet(() => fn(...a), ms, true);
global.clearTimeout = vClear;
global.clearInterval = vClear;
Date.now = () => base + now;

const PROFILES = {
  // TS0601 EF00 sensor (mains or battery), plug and IAS battery sensor as representative families.
  climate_sensor: { mfr: '_TZE200_bjawzodf', pid: 'TS0601', endpoints: { 1: ['basic', 'powerConfiguration', 'tuya', 'time'] }, battery: true },
  presence_sensor_radar: { mfr: '_TZE204_ijxvkhd0', pid: 'TS0601', endpoints: { 1: ['basic', 'tuya', 'time'] } },
  plug_energy_monitor: { mfr: '_TZ3000_okaz9tjs', pid: 'TS011F', endpoints: { 1: ['basic', 'onOff', 'electricalMeasurement', 'metering', 'identify'] } },
  motion_sensor: { mfr: '_TZ3000_kmh5qpmb', pid: 'TS0202', endpoints: { 1: ['basic', 'powerConfiguration', 'iasZone'] }, battery: true },
  water_valve_smart: { mfr: '_TZE284_z7a2jmyy', pid: 'TS0601', endpoints: { 1: ['basic', 'groups', 'scenes', 'tuya'] }, battery: true },
};

async function runOne(driverId) {
  const p = PROFILES[driverId] || { mfr: '_TZE200_test0000', pid: 'TS0601', endpoints: { 1: ['basic', 'tuya'] } };
  trace = []; now = 0; timers.clear(); seed = 3040;
  currentDriverId = driverId;
  const errors = [];
  const errStacks = [];
  const onErr = (e) => { errors.push(String(e && e.message || e).slice(0, 160)); if (e && e.stack) {errStacks.push(String(e.stack).split('\n').slice(0, 4).join(' | '));} };
  process.on('unhandledRejection', onErr);
  let initMs = null;
  try {
    const Cls = require(path.join(ROOT, 'drivers', driverId, 'device.js'));
    const dev = new Cls();
    dev.driver.id = driverId;
    dev._data = { id: `trace-${driverId}`, manufacturerName: p.mfr, productId: p.pid };
    dev._settings = { zb_manufacturer_name: p.mfr, zb_model_id: p.pid, zb_product_id: p.pid };
    dev._store = { zb_manufacturer_name: p.mfr, zb_product_id: p.pid };
    const compose = require(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'));
    dev._caps = (compose.capabilities || []).slice();
    dev.driver.manifest = { id: driverId, energy: compose.energy || {}, capabilities: dev._caps.slice() };
    const node = fakeNode(p);
    dev.node = node;
    dev.zclNode = node;
    if (typeof dev.onInit === 'function' && dev.onInit !== DeviceStub.prototype.onInit) {
      // ZigBeeDevice.onInit would ask homey.zigbee for the node; we call onNodeInit directly.
    }
    let done = false;
    const pInit = Promise.resolve().then(() => dev.onNodeInit({ zclNode: node })).then(() => { done = true; initMs = now; }, (e) => { done = true; initMs = now; onErr(e); });
    // advance the virtual clock
    const end = horizonS * 1000;
    while (now <= end) {
      await flush();
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) { if (done) {break;} now += 50; continue; }
      const [id, t] = next;
      if (t.at > end) {break;}
      now = Math.max(now, t.at);
      if (t.repeat) {t.at = now + t.repeat;} else {timers.delete(id);}
      try { const r = t.fn(); if (r && typeof r.catch === 'function') {r.catch(onErr);} } catch (e) { onErr(e); }
    }
    await flush();
    await Promise.race([pInit, Promise.resolve()]);
    try { dev._destroyed = true; await dev.onDeleted?.(); } catch (_e) { /* soft */ }
  } catch (e) { onErr(e); }
  process.removeListener('unhandledRejection', onErr);
  const tx = trace.filter((r) => ['read', 'bind', 'report', 'write', 'cmd', 'frame', 'discover'].includes(r.kind));
  let peak = 0;
  for (let i = 0; i < tx.length; i++) { let j = i; while (j < tx.length && tx[j].t - tx[i].t < 1000) {j++;} peak = Math.max(peak, j - i); }
  const byKind = {};
  for (const r of tx) {byKind[r.kind] = (byKind[r.kind] || 0) + 1;}
  return {
    driver: driverId,
    initMs,
    txFirst2s: tx.filter((r) => r.t < 2000).length,
    txPeak1s: peak,
    txTotal: tx.length,
    byKind,
    capsAdded: trace.filter((r) => r.kind === 'cap+').map((r) => r.detail),
    capsRemoved: trace.filter((r) => r.kind === 'cap-').map((r) => r.detail),
    capOps: trace.filter((r) => r.kind === 'cap-' || r.kind === 'cap+').map((r) => `${r.t}ms ${r.kind} ${r.detail}${r.at ? ` @ ${r.at}` : ''}`),
    notifications: trace.filter((r) => r.kind === 'notify').length,
    errors: [...new Set(errors)].slice(0, 5),
    firstTx: tx.slice(0, withStack ? 80 : 12).map((r) => `${r.t}ms ${r.kind} ${r.detail}${r.at ? ` @ ${r.at}` : ''}`),
    errorStacks: withStack ? errStacks.slice(0, 3) : undefined,
  };
}

const realLog = console.log;
if (asJson || !args.includes('--verbose')) { console.log = () => {}; console.info = () => {}; console.warn = () => {}; console.debug = () => {}; console.error = () => {}; }
(async () => {
  const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--horizon');
  const list = ids.length ? ids : Object.keys(PROFILES);
  const out = [];
  for (const id of list) {out.push(await runOne(id));}
  if (asJson) {process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);}
  else {for (const r of out) {realLog(`[pairing-trace] ${r.driver}: init=${r.initMs}ms txFirst2s=${r.txFirst2s} peak1s=${r.txPeak1s} total=${r.txTotal} ${JSON.stringify(r.byKind)} capsRemoved=${r.capsRemoved.length} notif=${r.notifications} errors=${r.errors.length}`);}}
  process.exit(0);
})();

module.exports = { PROFILES };
