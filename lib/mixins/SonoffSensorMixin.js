'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');

const CID = 0xFC11;
const MFR = { manufacturerCode: 0x1286, disableDefaultResponse: false };
const SA = {
  tamper: 0x2000,
  illumination: 0x2001,
  tempCal: 0x2003,
  humCal: 0x2004,
};

module.exports = { setupSonoffSensor: _setup, handleSonoffSensorSettings: _handle };

async function _setup(device, zclNode) {
  var m = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
  if (m !== 'sonoff' && m !== 'ewelink') return false;
  var pid = (device.getSetting('zb_model_id') || '').toUpperCase();
  var ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
  if (!ep) return false;
  var cl = ep.clusters && ep.clusters[CID];
  var ft = [];
  if (/SNZB-04/.test(pid) && cl) {
    try {
      if (!device.hasCapability('alarm_tamper')) await device.addCapability('alarm_tamper').catch(() => {});
      var tv = await cl.readAttributes([SA.tamper], MFR);
      if (tv && tv[SA.tamper] !== undefined) device.setCapabilityValue('alarm_tamper', !!tv[SA.tamper]).catch(() => {});
      ft.push('tamper');
    } catch (e) {}
  }
  if (/SNZB-02/.test(pid) && cl) {
    try {
      var cv = await cl.readAttributes([SA.tempCal, SA.humCal], MFR);
      if (cv && cv[SA.tempCal] !== undefined) device.setSettings({sonoff_temp_cal: safeParse(cv[SA.tempCal], 100)}).catch(() => {});
      if (cv && cv[SA.humCal] !== undefined) device.setSettings({sonoff_hum_cal: safeParse(cv[SA.humCal], 100)}).catch(() => {});
      ft.push('cal');
    } catch (e) {}
  }
  device._sonoffSnsCluster = cl;
  return ft.length > 0;
}

async function _handle(device, key, value) {
  var cl = device._sonoffSnsCluster;
  if (!cl) return false;
  try {
    if (key === 'sonoff_temp_cal') {
      await cl.writeAttributes({[SA.tempCal]: Math.round(parseFloat(value) * 100)}, MFR);
      return true;
    }
    if (key === 'sonoff_hum_cal') {
      await cl.writeAttributes({[SA.humCal]: Math.round(parseFloat(value) * 100)}, MFR);
      return true;
    }
  } catch (e) { device.log('[SONOFF-SNS] write:', e.message); }
  return false;
}
