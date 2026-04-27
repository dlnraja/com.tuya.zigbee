'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
      }
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

    const triggers = [
      'presence_detected',
      'presence_cleared',
      'presence_sensor_radar_motion_detected_sensor_presence_radar_hybrid',
      'presence_sensor_radar_illuminance_changed_sensor_presence_radar_hybrid',
      'presence_sensor_radar_distance_changed_sensor_presence_radar_hybrid',
      'presence_sensor_radar_lux_changed_sensor_presence_radar_hybrid',
      'presence_sensor_radar_battery_low_sensor_presence_radar_hybrid'
    ];

    for (const id of triggers) {
      try {
        const fullId = id.startsWith('sensor_presence_radar_hybrid') ? id : `sensor_presence_radar_hybrid_${id}`;
        this.homey.flow.getTriggerCard(fullId);
      } catch (e) {
        this.error(`Failed to register trigger ${id}: ${e.message}`);
        }
    // CONDITIONS
    const conditions = [
      { id: 'presence_sensor_radar_is_present_sensor_presence_radar_hybrid', capability: 'alarm_motion' },
      { id: 'presence_sensor_radar_illuminance_above_sensor_presence_radar_hybrid', capability: 'alarm_motion' },
      { id: 'presence_sensor_radar_distance_within_sensor_presence_radar_hybrid', capability: 'alarm_motion' },
      { id: 'presence_sensor_radar_motion_active_sensor_presence_radar_hybrid', capability: 'alarm_motion' }
    ];

    for (const cond of conditions) {
      try {
        const card = this.homey.flow.getConditionCard(cond.id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return args.device.getCapabilityValue(cond.capability) === true;
          });
        }
      } catch (e) {
        this.error(`Failed to register condition ${cond.id}: ${e.message}`);
        }
    this.log('[FLOW] All flow cards registered');
    }
module.exports = PresenceSensorRadarDriver;
