'use strict';

const { Driver } = require('homey');

class RemoteDimmerDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    this.log('Remote Control Dimmer driver initialized');

    // Trigger: ON button pressed
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_button_on'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: OFF button pressed
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_button_off'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Toggle button pressed
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_button_toggle'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Brightness up
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_brightness_up'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Brightness down
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_brightness_down'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Brightness stop
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_brightness_stop'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Brightness set
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_brightness_set'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);

    // Trigger: Scene recalled
      (() => { try { return this.homey.flow.getDeviceTriggerCard('remote_dimmer_scene'); } catch(e) { return null; } })();
      .registerRunListener(async () => true);
  }
}

module.exports = RemoteDimmerDriver;

