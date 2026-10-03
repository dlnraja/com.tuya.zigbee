'use strict';
// Spec 003 T4 — stable simple version: one trigger per real button press across channels.
// Drops only the copy of a press (same button + press type) that arrives over a DIFFERENT
// channel (scene / onOff / Tuya DP) within a fixed short window, or a repeated frame seq.
// Leading edge always passes; same-channel repeats are untouched (double/triple click kept);
// virtual presses (app/flow) are never gated.
const WINDOW_MS = 400;

function admitButtonPress(device, button, pressType, options = {}, now = Date.now()) {
  try {
    const channel = String(options.channel || options.source || 'physical');
    if (channel === 'virtual') { return true; }
    const st = device._simpleButtonGate || (device._simpleButtonGate = { last: new Map(), seq: new Map() });
    const seq = options.seq ?? options.transactionSequenceNumber;
    if (seq !== undefined && seq !== null) {
      const sk = `${channel}:${seq}`;
      const seen = st.seq.get(sk);
      st.seq.set(sk, now);
      if (st.seq.size > 64) { st.seq.delete(st.seq.keys().next().value); }
      if (seen !== undefined && now - seen < 2000) { return false; }
    }
    const key = `${button}#${pressType}`;
    const last = st.last.get(key);
    if (last && last.channel !== channel && now - last.ts < WINDOW_MS) {
      last.ts = now;
      return false;
    }
    st.last.set(key, { channel, ts: now });
  } catch (_e) { /* soft — never blocks a press */ }
  return true;
}

module.exports = { admitButtonPress, WINDOW_MS };
