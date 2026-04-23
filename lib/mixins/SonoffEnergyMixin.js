'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');


const CID = 0xFC11;
const MFR = { manufacturerCode: 0x1286, disableDefaultResponse: false };
const EA = {
  current: 0x7004,
  voltage: 0x7005,
  power: 0x7006,
  energyToday: 0x7009,
  energyMonth: 0x700a,
  energyYesterday: 0x700b,
};

module.exports = { setupSonoffEnergy: _setup };

async function _setup(device, zclNode) {
  var m = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
  if (m !== 'sonoff' && m !== 'ewelink' && !m.includes('7020') && !m.includes('ck-bl702')) return false;
  var pid = (device.getSetting('zb_model_id') || '').toUpperCase();
  if (!/S60ZB|S31ZB|SPM|SNZB-06P|7020|CK-BL702/.test(pid)) return false;
  var ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
  if (!ep) return false;
  var cl = ep.clusters && ep.clusters[CID];
  if (!cl) return false;
  device.log('[SONOFF-NRG] Init 0xFC11 energy');
  var vals = {};
  try { vals = (await cl.readAttributes(Object.values(EA), MFR)) || {}; }
  catch (e) { device.log('[SONOFF-NRG] Read:', e.message); }
  if (vals[EA.current] !== undefined && device.hasCapability('measure_current'))
    device.setCapabilityValue('measure_current', safeParse(vals[EA.current], 1000).catch(function(){}));
  if (vals[EA.voltage] !== undefined && device.hasCapability('measure_voltage'))
    device.setCapabilityValue('measure_voltage', safeParse(vals[EA.voltage], 1000).catch(function(){}));
  if (vals[EA.power] !== undefined && device.hasCapability('measure_power'))
    device.setCapabilityValue('measure_power', safeParse(vals[EA.power], 1000).catch(function(){}));
  device._sonoffNrgCluster = cl;
  device.log('[SONOFF-NRG] Ready');
  return true;
}
