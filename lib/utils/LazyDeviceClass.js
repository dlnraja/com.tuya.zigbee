'use strict';

// P3389: a driver's device.js is required when the app starts, but its class is only needed once a
// device of that driver is initialised (or a test/caller touches it). With ~450 drivers and a
// handful of paired devices, eager class bodies (and the shared libs they pull in) cost ~15 MB of a
// ~66 MB heap at boot (Bastien OOM SIGABRT, p3272). device.js keeps its full source text and its
// exports; the body just runs on first use. The returned value is a transparent stand-in for the
// class: new, extends, instanceof, static members and helper exports all forward to the real class.
// TUYA_EAGER_DEVICE_CLASSES=1 restores the old eager behaviour (diagnostics only).
// A require made while Module._load is replaced (hermetic test harnesses that hand device.js mocked
// 'homey' / 'homey-zigbeedriver' modules for the duration of one require) stays eager, so the body
// still resolves its dependencies through the loader that was in effect when it was required; a lazy
// body that runs after such a loader was put back replays its requires through the loader seen at
// require time (on Homey the loader never changes, so both cases are no-ops there).

const Module = require('module');

const LOADER_AT_START = Module._load;
const EAGER = /^(1|true|yes)$/i.test(String(process.env.TUYA_EAGER_DEVICE_CLASSES || ''));
const stats = { created: 0, loaded: 0, eager: 0 };
const PROBES = new WeakMap();

function lazyDeviceClass(mod, factory, opts) {
  // alwaysLazy: unit tests observe lazy behaviour even if a prior mocha file
  // left Module._load hooked (hermetic device.js requires stay eager otherwise).
  const alwaysLazy = !!(opts && opts.alwaysLazy);
  if (!alwaysLazy && (EAGER || Module._load !== LOADER_AT_START)) {
    stats.eager += 1;
    return factory();
  }
  stats.created += 1;
  // the loader in effect when device.js was required; its requires are replayed through it
  const loaderAtWrap = Module._load;
  let Real = null;
  let loading = false;
  let proxy = null;
  const target = function LazyDeviceClass() {};

  function load() {
    if (Real) { return Real; }
    if (loading) { throw new Error(`[P3389] device class used while it is still loading: ${mod && mod.filename}`); }
    loading = true;
    let made;
    const current = Module._load;
    const swap = current !== loaderAtWrap;
    if (swap) { Module._load = loaderAtWrap; }
    try {
      made = factory();
    } finally {
      if (swap && Module._load === loaderAtWrap) { Module._load = current; }
      loading = false;
      if (mod) { mod.exports = proxy; }
    }
    if (typeof made !== 'function') {
      throw new TypeError(`[P3389] device.js did not export a class: ${mod && mod.filename}`);
    }
    Real = made;
    stats.loaded += 1;
    // Mirror the real class on the proxy target so Proxy invariants hold for 'prototype'.
    Object.defineProperty(target, 'prototype', { value: Real.prototype, writable: false });
    Object.setPrototypeOf(target, Object.getPrototypeOf(Real));
    return Real;
  }

  const recv = (r, R) => r === proxy ? R : r;
  proxy = new Proxy(target, {
    get(_t, k, r) { const R = load(); return Reflect.get(R, k, recv(r, R)); },
    set(_t, k, v, r) { const R = load(); return Reflect.set(R, k, v, recv(r, R)); },
    has(_t, k) { return Reflect.has(load(), k); },
    ownKeys() { return Reflect.ownKeys(load()); },
    getOwnPropertyDescriptor(_t, k) { return Reflect.getOwnPropertyDescriptor(load(), k); },
    defineProperty(_t, k, d) { return Reflect.defineProperty(load(), k, d); },
    deleteProperty(_t, k) { return Reflect.deleteProperty(load(), k); },
    getPrototypeOf() { return Reflect.getPrototypeOf(load()); },
    setPrototypeOf(_t, p) { const R = load(); const ok = Reflect.setPrototypeOf(R, p); if (ok) { Object.setPrototypeOf(target, p); } return ok; },
    apply(_t, self, args) { return Reflect.apply(load(), self, args); },
    construct(_t, args, nt) { const R = load(); return Reflect.construct(R, args, nt === proxy ? R : nt); },
  });
  PROBES.set(proxy, () => Real !== null);
  if (mod) { mod.exports = proxy; }
  return proxy;
}

// true for a real class or a stand-in already used; false for a stand-in never touched (no trap fired).
function isMaterialized(value) {
  const probe = PROBES.get(value);
  return probe ? probe() : true;
}

module.exports = { lazyDeviceClass, isMaterialized, stats };
