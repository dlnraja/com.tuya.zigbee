'use strict';
// P3144 (forum Apps cat. topic 149230 #5 + Z2M tuya.ts TS0603 _TZE608_*): these openers expose DP1 as a
// raw "trigger the door movement" (Z2M: state STATE_SET, valueConverter.raw) and DP3 as the contact.
// Writing DP1=false (our old "close") does nothing on them, and they are DP-only (Z2M tuyaBase dp).
// Additive: other couples keep the previous behaviour.
const PULSE_MFR = /^_tze608_/i;
function settingsMfr(dev) {
  try { const s = dev.getSettings ? dev.getSettings() : {}; const d = dev.getData ? dev.getData() : {};
    return String(s.zb_manufacturer_name || s.zb_manufacturerName || d.manufacturerName || '');
  } catch (e) { return ''; }
}
function settingsPid(dev) {
  try { const s = dev.getSettings ? dev.getSettings() : {}; return String(s.zb_product_id || s.zb_modelId || s.zb_model_id || ''); } catch (e) { return ''; }
}
function isPulseTrigger(mfr, pid) {
  return PULSE_MFR.test(String(mfr || '')) && (!pid || /^TS0603$/i.test(String(pid)));
}
/** DP1 value to write for a requested garagedoor_closed state. */
function dp1Value(closed, pulse) { return pulse ? true : !closed; }
module.exports = { isPulseTrigger, dp1Value, settingsMfr, settingsPid };
