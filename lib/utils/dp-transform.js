'use strict';
// P3065: one place to apply a DP transform — plain function or ValueConverterRegistry { fromDevice } object.
// A throwing converter object falls back to the input value (functions keep their historical behaviour).
function applyTransform(t, v) {
  if (typeof t === 'function') {return t(v);}
  if (t && typeof t.fromDevice === 'function') {
    try { return t.fromDevice(v); } catch (_e) { return v; }
  }
  return v;
}
module.exports = { applyTransform };
