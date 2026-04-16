'use strict';

/**
 * IEEEAdvancedEnrollment - Advanced IAS Zone enrollment
 * Extends IEEEAddressManager with:
 * - reEnrollCie: zero + write per ZCL 8.2.2.2.3
 * - sendProactiveEnroll: SDK3 best practice
 * - setupEnrollListener: auto-respond to enroll requests
 * - pollZoneState: verify enrollment with retry
 * - findIasZoneCluster: multi-endpoint scan (1,2,0,all)
 * - initiateNormalMode: ZCL command
 * - fullEnrollmentFlow: combines all steps
 *
 * Correct attr: iasCIEAddress (zigbee-clusters iasZone.js)
 * Homey v8.1.1+ auto-writes CIE during pairing
 */
const IEEEAddressManager = require('./IEEEAddressManager');

class IEEEAdvancedEnrollment extends IEEEAddressManager {
  async reEnrollCie(ias) {
    try {
      this.device.log?.('[ADV] Re-enroll');
      await ias.writeAttributes({ iasCIEAddress: '0000000000000000' }).catch(() => {});
      await this._wait(1000);
      return await this.writeCieAddress(ias, { maxRetries: 3, verify: true });
    } catch (e) { return false; }
  }
  async sendProactiveEnroll(ias, zoneId = 10) {
    try {
      await ias.zoneEnrollResponse({ enrollResponseCode: 0, zoneId });
      return true;
    } catch (e) { return false; }
  }
  setupEnrollListener(ias, zoneId = 10) {
    const d = this.device;
    ias.onZoneEnrollRequest = () => {
      d.log?.('[ADV] Enroll request rx');
      ias.zoneEnrollResponse({
        enrollResponseCode: 0, zoneId
      }).catch(e => d.log?.('[ADV] Enroll resp fail:', e.message));
    };
    d.log?.('[ADV] Enroll listener set');
  }
  async pollZoneState(ias, maxWaitMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        const a = await ias.readAttributes(['zoneState']);
        if (a?.zoneState === 'enrolled' || a?.zoneState === 1) {
          this.device.log?.('[ADV] Zone enrolled');
          return true;
        }
      } catch (e) { /* retry */ }
      await this._wait(2000);
    }
    return false;
  }
  findIasZoneCluster(endpoints) {
    if (!endpoints) return null;
    for (const ep of [1, 2, 0]) {
      const ias = endpoints[ep]?.clusters?.iasZone;
      if (ias) return { endpoint: ep, cluster: ias };
    }
    for (const k of Object.keys(endpoints)) {
      const ias = endpoints[k]?.clusters?.iasZone;
      if (ias) return { endpoint: Number(k), cluster: ias };
    }
    return null;
  }
  async initiateNormalMode(ias) {
    try {
      await ias.initiateNormalOperationMode();
      this.device.log?.('[ADV] Normal mode initiated');
      return true;
    } catch (e) { return false; }
  }
  async fullEnrollmentFlow(opts = {}) {
    const d = this.device;
    const { zoneId = 10, maxWait = 10000 } = opts;
    const found = this.findIasZoneCluster(d.zclNode?.endpoints);
    if (!found) return false;
    const ias = found.cluster;
    this.setupEnrollListener(ias, zoneId);
    const needs = await this.needsCieEnrollment(ias);
    if (needs) await this.writeCieAddress(ias, { maxRetries: 3, verify: true }).catch(() => {});
    await this.sendProactiveEnroll(ias, zoneId);
    await this._wait(2000);
    return await this.pollZoneState(ias, maxWait);
  }
}
module.exports = IEEEAdvancedEnrollment;
