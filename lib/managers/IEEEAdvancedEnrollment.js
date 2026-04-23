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
      d.log?.('[ADV] Enroll request rx');ias.zoneEnrollResponse({
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
          this.device.log?.('[ADV] Zone enrolled');return true;
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
    const { zoneId = 10, maxWait = 15000 } = opts; // v5.15.5: Increased default wait to 15s
    const mfr = d.getSetting?.('zb_manufacturer_name') || d.getData?.()?.manufacturerName || '';
    const isHobeian = mfr.toUpperCase().includes('HOBEIAN');

    const found = this.findIasZoneCluster(d.zclNode?.endpoints);if (!found) return false;
    const ias = found.cluster;
    
    d.log?.(`[ADV] Starting flow for ${mfr} (Hobeian=${isHobeian})`);
    this.setupEnrollListener(ias, zoneId);
    
    // v5.13.0: Check if already correctly enrolled to Homey
    const isHomey = await this.isEnrolledToHomey(ias);
    if (isHomey) {
      d.log?.('[ADV] Already enrolled to Homey - sending proactive response');
      await this.sendProactiveEnroll(ias, zoneId);
      const state = await this.pollZoneState(ias, 3000);
      if (state) return true;
    }

    const needs = await this.needsCieEnrollment(ias);
    if (needs) {
      d.log?.('[ADV] Needs initial enrollment');
      await this.writeCieAddress(ias, { maxRetries: 3, verify: true }).catch(() => {});
    } else {
      // Enrolled to something else (another hub or partial pairing)
      d.log?.('[ADV] Enrolled to non-Homey CIE - forcing re-enrollment');
      // v1.1.2: Hobeian devices need extra time after re-enroll
      await this.reEnrollCie(ias);
      if (isHobeian) await this._wait(2000);
    }

    await this.sendProactiveEnroll(ias, zoneId);
    
    // v1.1.2: Hobeian devices need a significant pause here
    if (isHobeian) {
      d.log?.('[ADV] Hobeian throttle - waiting 4s before final poll');
      await this._wait(4000);
    } else {
      await this._wait(2000);
    }

    return await this.pollZoneState(ias, isHobeian ? 20000 : maxWait);
  }
}
module.exports = IEEEAdvancedEnrollment;


