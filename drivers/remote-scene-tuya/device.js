const diag = require('../../lib/common/diagnostics');
const interview = require('../../lib/zigbee/interview');
const reporting = require('../../lib/zigbee/reporting');
const fp = require('../../lib/tuya/fingerprints');
const convert = require('../../lib/tuya/convert');

class TuyaSceneRemote extends Homey.Device {
  async onInit() {
    const meta = await fp.resolve(this, { familyHint: 'remote' });
    this.log('fp:', meta);
    this.dpMap = convert.build('remote', meta.overlay);

    await reporting.setupDefaultReports(this, { buttonEvery: 0 });
    diag.maybeLogInterview(this, { unknownDpWarn: true });
  }
  
  onTuyaDp(dp, raw) {
    const m = this.dpMap[dp];
    if (!m) return;
    const val = convert.toCapability(m, raw);
    if (val !== undefined) this.setCapabilityValue(m.cap, val).catch(this.error);
  }
}

module.exports = TuyaSceneRemote;
