'use strict';
/**
 * P3020: one test file, two runners.
 *
 * The critical suite is executed both by `node --test` (local gates, per-file CI steps) and by
 * `mocha` (pr-gate). Files written in mocha style (describe/it/before... as globals) crashed under
 * `node --test` with "describe is not defined", which is why ~30 files per branch showed up as
 * failing although every assertion passes under mocha.
 *
 * Under mocha the real globals are returned untouched. Under node:test the same names are mapped
 * onto node:test, and the mocha `this` context is emulated for the two calls the suite uses:
 * `this.timeout(ms)` (forwarded as a per-test timeout hint, otherwise a no-op) and `this.skip()`
 * (marks the test skipped and stops it, like mocha does).
 */

const SKIP = Symbol('p3020-skip');

function mochaGlobals() {
  const g = globalThis;
  if (typeof g.describe === 'function' && typeof g.it === 'function') {
    return {
      describe: g.describe, it: g.it, before: g.before, after: g.after,
      beforeEach: g.beforeEach, afterEach: g.afterEach, runner: 'mocha',
    };
  }
  return null;
}

function makeCtx(t) {
  return {
    timeout() { return this; },
    slow() { return this; },
    retries() { return this; },
    skip(reason) {
      if (t && typeof t.skip === 'function') { t.skip(reason); }
      throw SKIP;
    },
  };
}

function wrapFn(fn) {
  if (typeof fn !== 'function') { return fn; }
  // Mocha's done-callback style: fn(done). node:test passes (t, done) when fn.length >= 2.
  if (fn.length >= 1) {
    return function wrappedDone(t, done) {
      const ctx = makeCtx(t);
      let finished = false;
      const cb = (err) => { if (!finished) { finished = true; done(err); } };
      try {
        const r = fn.call(ctx, cb);
        if (r && typeof r.then === 'function') {
          r.then(() => cb(), (e) => cb(e === SKIP ? undefined : e));
        }
      } catch (e) {
        cb(e === SKIP ? undefined : e);
      }
    };
  }
  return async function wrapped(t) {
    const ctx = makeCtx(t);
    try {
      return await fn.call(ctx);
    } catch (e) {
      if (e === SKIP) { return undefined; }
      throw e;
    }
  };
}

function wrapTestApi(api) {
  const out = function testLike(name, opts, fn) {
    if (typeof opts === 'function') { return api(name, wrapFn(opts)); }
    return api(name, opts, wrapFn(fn));
  };
  out.skip = (name, fn) => api.skip(name, wrapFn(fn));
  out.only = (name, fn) => api.only(name, wrapFn(fn));
  return out;
}

function nodeTestGlobals() {
  const nt = require('node:test');
  const describe = function d(name, fn) {
    return nt.describe(name, function suite() { return fn.call(makeCtx(null)); });
  };
  describe.skip = (name, fn) => nt.describe.skip(name, fn);
  describe.only = (name, fn) => nt.describe.only(name, fn);
  const hook = (h) => (fn) => h(wrapFn(fn));
  return {
    describe,
    it: wrapTestApi(nt.it),
    before: hook(nt.before),
    after: hook(nt.after),
    beforeEach: hook(nt.beforeEach),
    afterEach: hook(nt.afterEach),
    runner: 'node:test',
  };
}

module.exports = mochaGlobals() || nodeTestGlobals();
module.exports.SKIP = SKIP;
