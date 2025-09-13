'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSceneSwitchDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300,
            maxInterval: 3600,
            minChange: 5,
          },
        },
      });
    }

    // Register button capability for scene control
    if (this.hasCapability('button')) {
      this.registerCapability('button', 'genOnOff');
    }

    // Listen for scene/button press events
    zclNode.endpoints[1].clusters.genScenes.on('attr.currentScene', this.onSceneChanged.bind(this));
    zclNode.endpoints[1].clusters.genOnOff.on('attr.onOff', this.onButtonPressed.bind(this));

    this.log('Tuya Scene Switch initialized');
  }

  onSceneChanged(scene) {
    this.log('Scene changed:', scene);
    this.homey.flow.getDeviceTriggerCard('scene_changed').trigger(this, { scene: scene });
  }

  onButtonPressed(pressed) {
    this.log('Button pressed:', pressed);
    this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this, { button: pressed ? 'on' : 'off' });
  }

}

module.exports = TuyaSceneSwitchDevice;
