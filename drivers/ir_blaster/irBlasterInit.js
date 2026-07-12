'use strict';

const MAINS = '_TZ3290_gnl5a6a5xvql7c2a';

async function init(dev) {
  let mfr = '';
  try {
    const d = dev.getData() || {};
    mfr = d.manufacturerName || '';
    const mdl = d.modelId || '';
    if (mfr) {await dev.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});}
    if (mdl) {await dev.setSettings({ zb_model_id: mdl }).catch(() => {});}
    dev.log(`[IR] ${  mfr  } / ${  mdl}`);
  } catch (err) {
    dev.log('[IR] Could not persist device identity:', err.message);
  }

  if (mfr.toLowerCase() === MAINS.toLowerCase()) {
    await dev.removeCapability('measure_battery').catch(() => {});
  }
}

module.exports = { init };
