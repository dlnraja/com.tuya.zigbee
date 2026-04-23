'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');
const ATTRS = {childLock:0x0000,openWindow:0x6000,frostTemp:0x6002,valveDeg:0x600b,tempSel:0x600e,extTemp:0x600d};
const MFR = {manufacturerCode:0x1286};

module.exports = async function setupSonoffTRVZB(device, zclNode) {
  const pid = (device.getSetting('zb_model_id')||'').toUpperCase();
  if (pid !== 'TRVZB') return false;
  device.log('[SONOFF-TRVZB] Setting up cluster 0xFC11');
  const ep = zclNode?.endpoints?.[1];
  if (!ep) return false;

  for (const c of ['locked','alarm_contact']) {
    if (!device.hasCapability(c)) await device.addCapability(c).catch(()=>{});
  }

  try {
    const vals = await ep.clusters[0xFC11]?.readAttributes([ATTRS.childLock, ATTRS.openWindow, ATTRS.valveDeg], MFR);
    if (vals) {
      if (vals[ATTRS.childLock] !== undefined && device.hasCapability('locked'))
        device.setCapabilityValue('locked', !!vals[ATTRS.childLock]).catch(()=>{});
      if (vals[ATTRS.openWindow] !== undefined && device.hasCapability('alarm_contact'))
        device.setCapabilityValue('alarm_contact', !!vals[ATTRS.openWindow]).catch(()=>{});
    }
  } catch(e) { device.log('[SONOFF-TRVZB] Read err:', e.message); }

  if (device.hasCapability('locked')) {
    device.registerCapabilityListener('locked', async (v) => {
      try { await ep.clusters[0xFC11]?.writeAttributes({[ATTRS.childLock]: v ? 1 : 0}, MFR); }
      catch(e) { device.log('[SONOFF-TRVZB] child_lock write err:', e.message); }
    });
  }

  try {
    const thermo = ep.clusters?.hvacThermostat;
    if (thermo && device.hasCapability('thermostat_mode')) {
      device.registerCapabilityListener('thermostat_mode', async (v) => {
        const map = {off: 0, auto: 1, heat: 4};
        await thermo.writeAttributes({systemMode: map[v] ?? 4});
      });
    }
    if (thermo && device.hasCapability('target_temperature')) {
      device.registerCapabilityListener('target_temperature', async (v) => {
        await thermo.writeAttributes({occupiedHeatingSetpoint: Math.round(v * 100)});
      });
    }
  } catch(e) { device.log('[SONOFF-TRVZB] thermo listener err:', e.message); }

  device.log('[SONOFF-TRVZB] Ready');
  return true;
};
