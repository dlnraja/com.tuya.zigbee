'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch4Gang extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('WallSwitch4Gang 1-way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'wall_switch_4gang_1way';
    const gangs = ['gang1', 'gang2', 'gang3', 'gang4'];

    // Safe card getter
    const safeGet = (type, id) => {
      try {
        return type === 'condition'
          ? this.homey.flow.getConditionCard(id)
          : this.homey.flow.getActionCard(id);
      } catch (e) { return null; }
    };

    // TRIGGERS (Ensure they are accessible)
    gangs.forEach(gang => {
      ['turned_on', 'turned_off', 'physical_on', 'physical_off', 'scene'].forEach(type => {
        try {
          const id = type === 'scene' ? `${P}_${gang}_scene` :
                    type.startsWith('physical') ? `${P}_physical_${gang}_${type.split('_')[1]}` : `${P}_${gang}_${type}`;
          this.homey.flow.getTriggerCard(id);
        } catch (e) {}
      });
    });

    // CONDITIONS
    gangs.forEach((gang, idx) => {
      try {
        const id = `${P}_${gang}_is_on`;
        const card = safeGet('condition', id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
        }
      } catch (err) { this.error(`Condition ${gang} failed:`, err.message); }
    });

    // ACTIONS
    gangs.forEach((gang, idx) => {
      try {
        const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
        ['turn_on', 'turn_off', 'toggle'].forEach(action => {
          try {
            const id = `${P}_${action}_${gang}`;
            const card = safeGet('action', id);
            if (card) {
              card.registerRunListener(async (args) => {
                if (!args.device) return false;
                let val = action === 'turn_on' ? true : (action === 'turn_off' ? false : !args.device.getCapabilityValue(cap));
                await args.device.triggerCapabilityListener(cap, val);
                return true;
              });
            }
          } catch (e) {}
        });
      } catch (err) { this.error(`Actions ${gang} failed:`, err.message); }
    });

    // SETTINGS ACTIONS
    [{ id: 'set_backlight', fn: 'setBacklightMode' }, { id: 'set_scene_mode', fn: 'setSceneMode' }].forEach(act => {
      try {
        const card = safeGet('action', `${P}_${act.id}`);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            if (typeof args.device[act.fn] === 'function') {
              await args.device[act.fn](args.mode || args.value);
              return true;
            }
            return false;
          });
        }
      } catch (err) { this.error(`Action ${act.id} failed:`, err.message); }
    });
  }
}

module.exports = WallSwitch4Gang;
