'use strict';
const { Driver } = require('homey');

class PresenceRadarDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('Presence Radar Driver initialized');

    const triggers = ['radar_presence_detected', 'radar_presence_cleared'];
    for (const id of triggers) {
      try {
        const card = this.homey.flow.getTriggerCard(id);
        if (card) {
          // rule-19 logic could go here
        }
      } catch (e) {
        this.error(`Error registering trigger ${id}:`, e.message);
      }
    }
  }
}

module.exports = PresenceRadarDriver;
