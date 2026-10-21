'use strict';
/**
 * P2931 — lazy module handle. `lazy(() => require('./X'))` returns a stand-in that loads the module
 * on first real use (new, call, property read, instanceof) and then forwards everything to it.
 *
 * WHY: every driver loads at app start, so a module required at the top of a shared base class is
 * paid by every install even when no paired device ever runs that path (cloud login, EF00 manager on
 * native-only setups, protocol helpers). The stand-in keeps the module optional exactly as before:
 * `optional` resolves the file now (cheap, no load) and returns null when it is missing, so
 * `if (X) ...` guards keep working. Do not use it for a class that is extended at module load.
 */
const LOADED = new Set();
function lazy(load, { name = 'module', optional = false, resolve = null, meta = null } = {}) {
  if (optional && resolve) {
    try { resolve(); } catch (_e) { return null; }
  }
  let real;
  let done = false;
  const get = () => {
    if (!done) { real = load(); done = true; LOADED.add(name); }
    return real;
  };
  const target = function lazyModule() {};
  return new Proxy(target, {
    get: (_t, k) => {
      if (k === '__lazyLoaded') {return done;}
      if (meta && Object.prototype.hasOwnProperty.call(meta, k)) {return meta[k](done);}
      const r = get();
      const v = r == null ? undefined : r[k];
      return v;
    },
    has: (_t, k) => k in Object(get()),
    set: (_t, k, v) => { get()[k] = v; return true; },
    construct: (_t, args, nt) => Reflect.construct(get(), args, nt === _t || nt === undefined ? get() : nt),
    apply: (_t, self, args) => Reflect.apply(get(), self, args),
    getPrototypeOf: () => Object.getPrototypeOf(get()),
    ownKeys: (t) => [...new Set([...Reflect.ownKeys(Object(get())), ...Reflect.ownKeys(t).filter((k) => !Object.getOwnPropertyDescriptor(t, k).configurable)])],
    getOwnPropertyDescriptor: (t, k) => {
      const own = Object.getOwnPropertyDescriptor(t, k);
      if (own && !own.configurable) {return own;}
      const d = Object.getOwnPropertyDescriptor(Object(get()), k);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

/**
 * P2955 — `lazyRequire(require, './X')` form (P2830 style) on top of `lazy`, so callers can pass
 * their own `require` (relative paths resolve from the caller). Exposes __lazyRequirePath and
 * __lazyRequireLoaded for diagnostics; a load error surfaces at first use, never at creation.
 */
function lazyRequire(requireFn, modPath) {
  return lazy(() => requireFn(modPath), {
    name: String(modPath),
    meta: { __lazyRequirePath: () => modPath, __lazyRequireLoaded: (done) => done },
  });
}

module.exports = { lazy, lazyRequire, LOADED };
