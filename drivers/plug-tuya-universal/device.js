const diag = require('../../lib/common/diagnostics');
const interview = require('../../lib/zigbee/interview');
const reporting = require('../../lib/zigbee/reporting');
const fp = require('../../lib/tuya/fingerprints');
const convert = require('../../lib/tuya/convert');

class TuyaUniversalPlug extends Homey.Device {
  async onInit() {
    const meta = await fp.resolve(this, { familyHint: 'plug' });
    this.log('fp:', meta);
    this.dpMap = convert.build('plug', meta.overlay);

    await reporting.setupDefaultReports(this, { powerEvery: 30 });
    diag.maybeLogInterview(this, { unknownDpWarn: true });
  }
  
  onTuyaDp(dp, raw) {
    const m = this.dpMap[dp];
    if (!m) return;
    const val = convert.toCapability(m, raw);
    if (val !== undefined) this.setCapabilityValue(m.cap, val).catch(this.error);
  }
}

module.exports = TuyaUniversalPlug;
