const diag = require('../../lib/common/diagnostics');
const interview = require('../../lib/zigbee/interview');
const reporting = require('../../lib/zigbee/reporting');
const fp = require('../../lib/tuya/fingerprints');
const convert = require('../../lib/tuya/convert');

class TuyaTRV extends Homey.Device {
  async onInit() {
    const meta = await fp.resolve(this, { familyHint: 'trv' });
    this.log('fp:', meta);
    this.dpMap = convert.build('trv', meta.overlay);

    await reporting.setupDefaultReports(this, { temperatureEvery: 60 });
    diag.maybeLogInterview(this, { unknownDpWarn: true });
  }
  
  onTuyaDp(dp, raw) {
    const m = this.dpMap[dp];
    if (!m) return;
    const val = convert.toCapability(m, raw);
    if (val !== undefined) this.setCapabilityValue(m.cap, val).catch(this.error);
  }
}

module.exports = TuyaTRV;
