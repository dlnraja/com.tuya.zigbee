'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SceneSwitch6chDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SceneSwitch6chDriver initialized');
    registerButtonFlowCards(this, 'scene_switch_6ch', 6);
  }
}

module.exports = SceneSwitch6chDriver;
