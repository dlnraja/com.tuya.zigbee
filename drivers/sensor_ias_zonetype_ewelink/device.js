'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { capabilityForZoneType, decodeZoneStatus, alarmFor, ALL_ZONE_CAPABILITIES } = require('../../lib/sensors/IasZoneTypeRouter');

/**
 * eWeLink / SNZB-03 — ambiguous identity (PIR in JohanBendz #1113/#1008, SQ510A water
 * detector in #1475; both EP1 [0,3,1,1280,32]). The alarm capability is chosen from the
 * device's own IAS zoneType, never from the manufacturer/model pair. Rules:
 * docs/rules/JOHAN_1113_AMBIGUOUS_IAS_IDENTITY.md
 */
class IasZoneTypeEwelinkDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    await this._resolveZoneCapability(zclNode).catch((e) => this.log('[ZONETYPE] resolve failed:', e.message));
    await super.onNodeInit({ zclNode });
  }

  /** zoneType-resolved capability decides the alarm, not the mfr/driver-type tables. */
  async _handleIASZoneStatus(status) {
    const cap = this.getStoreValue('ias_zone_capability');
    if (!cap || !this.hasCapability(cap)) {return;}
    const d = decodeZoneStatus(status);
    const v = alarmFor(cap, d);
    if (v == null) {return;}
    await this.setCapabilityValue(cap, v).catch(() => { });
    if (this.hasCapability('alarm_tamper')) {await this.setCapabilityValue('alarm_tamper', d.tamper).catch(() => { });}
  }

  /** Never let the base default an unknown zone to motion: wait for the real zoneType. */
  async _setupIASZone(clusters) {
    if (ALL_ZONE_CAPABILITIES.some((c) => this.hasCapability(c))) {return super._setupIASZone(clusters);}
    const ias = clusters?.iasZone || clusters?.ssIasZone;
    if (!ias) {return undefined;}
    ias.on('attr.zoneStatus', (status) => {
      if (ALL_ZONE_CAPABILITIES.some((c) => this.hasCapability(c))) {this._handleIASZoneStatus(status);}
    });
    return undefined;
  }

  async _resolveZoneCapability(zclNode) {
    const stored = this.getStoreValue('ias_zone_capability');
    let cap = stored || null;
    if (!cap) {
      const ias = zclNode?.endpoints?.[1]?.clusters?.iasZone;
      if (!ias) {return;}
      const attrs = await ias.readAttributes(['zoneType']).catch(() => null);
      cap = capabilityForZoneType(attrs?.zoneType);
      this.log(`[ZONETYPE] zoneType=${attrs?.zoneType} → ${cap || 'unknown (retry next wake)'}`);
      if (!cap) {
        // Sleepy device: retry once on the next IAS report, do not guess.
        if (!this._zoneRetryArmed) {
          this._zoneRetryArmed = true;
          ias.on('attr.zoneStatus', () => {
            if (this.getStoreValue('ias_zone_capability')) {return;}
            this._resolveZoneCapability(zclNode).catch(() => { });
          });
        }
        return;
      }
      await this.setStoreValue('ias_zone_capability', cap).catch(() => { });
    }
    for (const other of ALL_ZONE_CAPABILITIES) {
      if (other !== cap && this.hasCapability(other)) {await this.removeCapability(other).catch(() => { });}
    }
    if (!this.hasCapability(cap)) {await this.addCapability(cap).catch(() => { });}
  }
}

module.exports = IasZoneTypeEwelinkDevice;
