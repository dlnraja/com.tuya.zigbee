'use strict';

/**
 * lazyRequire (P2830) — defer loading a module until its first real use.
 *
 * WHY: the Homey app budget is ~64 MB. app.js used to load ~150 modules at require time even when
 * the BootBudget deferred pass decided "not enough heap for heavy features" and never used them.
 * `const X = lazyRequire(require, './lib/x')` returns a cheap stand-in that behaves like the real
 * export for `new X()`, `X(...)`, `X.prop`, `X.method()` and `'k' in X`. The real module is
 * required once, on first use, and cached. Failure to load is thrown at the use site (inside the
 * caller's existing try/catch), never at boot.
 *
 * Not for values that are stored/compared by identity at boot (use a plain require there).
 */

function lazyRequire(parentRequire, request) {
  let mod; let loaded = false;
  const real = () => {
    if (!loaded) { mod = parentRequire(request); loaded = true; }
    return mod;
  };
  // function target so that `new` / call traps are available
  const target = function lazyTarget() {};
  return new Proxy(target, {
    construct: (_t, args) => Reflect.construct(real(), args),
    apply: (_t, thisArg, args) => Reflect.apply(real(), thisArg, args),
    get: (_t, prop) => {
      if (prop === '__lazyRequirePath') { return request; }
      if (prop === '__lazyRequireLoaded') { return loaded; }
      return Reflect.get(real(), prop);
    },
    has: (_t, prop) => Reflect.has(real(), prop),
    set: (_t, prop, value) => Reflect.set(real(), prop, value),
    getPrototypeOf: () => Object.getPrototypeOf(real()),
  });
}

module.exports = { lazyRequire };
