'use strict';

const CID = 0xFC11;
const MFR = { manufacturerCode: 0x1286, disableDefaultResponse: false };
const SA = {
  tamper: 0x2000,
  illumination: 0x2001,
  tempCal: 0x2003,
  humCal: 0x2004,
};
const OCC = {
  timeout: 0x0020,
  sensitivity: 0x0022,
};

module.exports = { setupSonoffSensor: _setup, handleSonoffSensorSettings: _handle };

async function _setup(device, zclNode) {
  const m = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
  if (m !== 'sonoff' && m !== 'ewelink') {return false;}
  const pid = (device.getSetting('zb_model_id') || '').toUpperCase();
  const ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
  if (!ep) {return false;}
  const cl = ep.clusters && ep.clusters[CID];
  const ft = [];
  if (/SNZB-04/.test(pid) && cl) {
    try {
      if (!device.hasCapability('alarm_tamper'))
        {await device.addCapability('alarm_tamper').catch(() => device.log('[SONOFF-SNS] addCapability alarm_tamper failed')); }
      const tv = await cl.readAttributes([SA.tamper], MFR);
      if (tv && tv[SA.tamper] !== undefined)
        {device.setCapabilityValue('alarm_tamper', !!tv[SA.tamper]).catch(() => device.log('[SONOFF-SNS] setCapabilityValue alarm_tamper failed')); }
      ft.push('tamper');
    } catch (e) { device.log('[SNS]', e.message); }
  }
  if (/SNZB-02/.test(pid) && cl) {
    try {
      const cv = await cl.readAttributes([SA.tempCal, SA.humCal], MFR);
      if (cv && cv[SA.tempCal] !== undefined)
        {device.setSettings({sonoff_temp_cal: String(cv[SA.tempCal]/100)}).catch(() => device.log('[SONOFF-SNS] setSettings temp_cal failed')); }
      if (cv && cv[SA.humCal] !== undefined)
        {device.setSettings({sonoff_hum_cal: String(cv[SA.humCal]/100)}).catch(() => device.log('[SONOFF-SNS] setSettings hum_cal failed')); }
      ft.push('cal');
    } catch (e) { device.log('[SNS]', e.message); }
  }
  device._sonoffSnsCluster = cl;
  device.log('[SONOFF-SNS]', ft.join(',') || 'none');
  return ft.length > 0;
}

async function _handle(device, key, value) {
  const cl = device._sonoffSnsCluster;
  if (!cl) {return false;}
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
