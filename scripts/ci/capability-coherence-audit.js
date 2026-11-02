'use strict';
/**
 * P3135 (t719u/t721u/t722u/t723u): static capability coherence audit.
 *  A. same setting => same caps: drivers exposing enable_power_estimation must get estimated
 *     measure_power/meter_power (compose caps, or a base that wires EstimatedEnergyCaps / estimator).
 *  B. HomeKit-unmapped caps (Homey bridge maps system caps only); custom caps are fine but counted.
 *  C. real DPs with no exposed capability/setting/flow (capability: null without setting/flow).
 * Ratchet: counts may only go down. Report-only details via AUDIT_VERBOSE=1.
 */
const fs = require('fs');
const path = require('path');
const HK = new Set(['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_co2', 'measure_pm25', 'measure_co',
  'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_co', 'alarm_tamper', 'alarm_battery',
  'measure_battery', 'windowcoverings_set', 'windowcoverings_state', 'target_temperature', 'thermostat_mode',
  'locked', 'volume_set', 'speaker_playing', 'fan_speed', 'alarm_generic', 'button', 'homealarm_state',
  'measure_power', 'meter_power']);
const BASE_WIRED = /UnifiedSwitchBase|UnifiedPlugBase|VirtualEnergy|EstimatedEnergyCaps/;

function run(root) {
  const dd = path.join(root, 'drivers');
  const out = { A: [], B: [], C: [] };
  // P3228: a continuation shares its root's caps/settings; audit the logical driver once.
  const dc = require('../../lib/drivers/DriverContinuations').load(root);
  for (const d of fs.readdirSync(dd).sort()) {
    if (dc.isContinuation(d)) {continue;}
    const cf = path.join(dd, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(cf, 'utf8')); } catch (_e) { continue; }
    const caps = (j.capabilities || []).map((c) => String(c).split('.')[0]);
    const dev = path.join(dd, d, 'device.js');
    const src = fs.existsSync(dev) ? fs.readFileSync(dev, 'utf8') : '';
    const settingsTxt = JSON.stringify(j.settings || []);
    if (/enable_power_estimation/.test(settingsTxt) && caps.includes('onoff')
      && !caps.includes('measure_power') && !BASE_WIRED.test(src)) {out.A.push(d);}
    for (const c of new Set(caps)) {if (!HK.has(c)) {out.B.push(`${d}:${c}`);}}
    for (const line of src.split('\n')) {
      if (/capability:\s*null/.test(line) && !/setting|flow|trigger|ignore|reserved/i.test(line)) {out.C.push(`${d}:${line.trim().slice(0, 80)}`);}
    }
  }
  return out;
}
module.exports = { run, HK };
if (require.main === module) {
  const r = run(process.argv[2] || '.');
  console.log(JSON.stringify({ A: r.A.length, B: r.B.length, C: r.C.length }));
  if (process.env.AUDIT_VERBOSE) {console.log(JSON.stringify(r, null, 1));}
}
