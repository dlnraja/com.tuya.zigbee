'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const MAINS = '_TZ3290_gnl5a6a5xvql7c2a';

async function init(dev) {
  let mfr = '';
  try {
    const d = dev.getData() || {};
    mfr = d.manufacturerName || '';
    const mdl = d.modelId || '';
    if (mfr) await dev.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});
    if (mdl) await dev.setSettings({ zb_model_id: mdl }).catch(() => {});
    dev.log('[IR] ' + mfr + ' / ' + mdl);
  } catch (e) {}

  if (mfr === MAINS) {
    await dev.removeCapability('measure_battery').catch(() => {});
  } else if (dev.hasCapability('measure_battery')) {
    try {
      const ep = dev.zclNode?.endpoints?.[1] || dev._zclNode?.endpoints?.[1];
      if (ep?.clusters?.powerConfiguration) {
        ep.clusters.powerConfiguration.on('attr.batteryPercentageRemaining', (v) => {
          if (v != null) {
            dev.setCapabilityValue('measure_battery', Math.round(v / 2)).catch(() => {});
          }
        });
        const r = await ep.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']).catch(() => null);
        if (r?.batteryPercentageRemaining != null) {
          dev.setCapabilityValue('measure_battery', Math.round(r.batteryPercentageRemaining / 2)).catch(() => {});
        }
        dev.log('[IR] Battery reporting active');
      }
    } catch (e) { dev.log('[IR] Battery setup err:', e.message); }
  }
}

module.exports = { init };
