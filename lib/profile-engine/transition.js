'use strict';
/** P-KB3 transition (Z2M "transition" option, own implementation): optional transitionTime (1/10 s) for level/color commands. */
function transitionTenths(device, opts = {}) {
  if (opts.duration != null && Number.isFinite(Number(opts.duration))) {return Math.max(0, Math.min(6000, Math.round(Number(opts.duration) / 100)));}
  let ms; try { ms = Number(device?.getSetting?.('pe_transition_ms')); } catch { ms = 0; }
  return Number.isFinite(ms) && ms > 0 ? Math.min(6000, Math.round(ms / 100)) : null;
}
/** Adds transitionTime only when configured, never overrides a caller-provided one. */
function withTransition(device, payload, opts) {
  const t = transitionTenths(device, opts); if (t == null || (payload && payload.transitionTime != null)) {return payload;}
  return { ...payload, transitionTime: t };
}
module.exports = { transitionTenths, withTransition };
