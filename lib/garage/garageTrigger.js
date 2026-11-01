'use strict';
// P3144 (forum Apps cat. topic 149230 #5 + Z2M tuya.ts TS0603 _TZE608_*): these openers expose DP1 as a
// raw "trigger the door movement" (Z2M: state STATE_SET, valueConverter.raw) and DP3 as the contact.
// Writing DP1=false (our old "close") does nothing on them, and they are DP-only (Z2M tuyaBase dp).
// Additive: other couples keep the previous behaviour.
// P3159: exact couples only (one couple, one driver) - Z2M tuya.ts fingerprint TS0603 [
//   _TZE608_c75zqghm, _TZE608_fmemczv1, _TZE608_xkr8gep3, _TZE608_lapuuoke ] (DP1 raw, DP3 contact).
// No prefix match: unknown _TZE608_*/_TZE208_* keep the previous open/close behaviour.
const PULSE_MFRS = new Set(['_tze608_c75zqghm', '_tze608_fmemczv1', '_tze608_xkr8gep3', '_tze608_lapuuoke']);
function settingsMfr(dev) {
  try { const s = dev.getSettings ? dev.getSettings() : {}; const d = dev.getData ? dev.getData() : {};
    return String(s.zb_manufacturer_name || s.zb_manufacturerName || d.manufacturerName || '');
  } catch (e) { return ''; }
}
function settingsPid(dev) {
  try { const s = dev.getSettings ? dev.getSettings() : {}; return String(s.zb_product_id || s.zb_modelId || s.zb_model_id || ''); } catch (e) { return ''; }
}
function isPulseTrigger(mfr, pid) {
  return PULSE_MFRS.has(String(mfr || '').trim().toLowerCase()) && (!pid || /^TS0603$/i.test(String(pid)));
}
/** DP1 value to write for a requested garagedoor_closed state. */
function dp1Value(closed, pulse) { return pulse ? true : !closed; }
module.exports = { PULSE_MFRS, isPulseTrigger, dp1Value, settingsMfr, settingsPid };
