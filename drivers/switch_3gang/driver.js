'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { setGangOnOff } = require('../../lib/drivers/FlowGangControl');

class TuyaZigbeeDriver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Tuya Zigbee 3-Gang Switch Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'switch_3gang';
    
    // TRIGGERS (Ensure they are accessible)
    ['gang1', 'gang2', 'gang3'].forEach(gang => {
      ['turned_on', 'turned_off', 'physical_on', 'physical_off', 'scene'].forEach(type => {
        try {
          const id = type === 'scene' ? `${P}_${gang}_scene` : 
                    type.startsWith('physical') ? `${P}_physical_${gang}_${type.split('_' )[1]}` : `${P}_${gang}_${type}`;
          this._getFlowCard(id, 'trigger');
        } catch (e) {}
      });
      });

    // CONDITIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        const id = `${P}_${gang}_is_on`;
        const card = this._getFlowCard(id, 'condition');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
        }
      } catch (err) { this.error(`Condition ${gang} failed:`, err.message); }
    });

    // ACTIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        const gangNumber = idx + 1;

        ['turn_on', 'turn_off', 'toggle'].forEach(action => {
          try {
            const id = `${P}_${action}_${gang}`;
            const card = this._getFlowCard(id, 'action');
            if (card) {
              card.registerRunListener(async (args) => {
                if (!args.device) {return false;}
                const val = action === 'turn_on' ? true : action === 'turn_off' ? false : 'toggle';
                await setGangOnOff(args.device, gangNumber, val);
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
        const card = this._getFlowCard(`${P}_${act.id}`, 'action');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            if (typeof args.device[act.fn] === 'function') {
              await args.device[act.fn](args.mode || args.value);
              return true;
            }
            return false;
          });
        }
      } catch (err) { this.error(`Action ${act.id} failed:`, err.message); }
    });

    // Power On Behavior action
    try {
      // WHY: keep driver namespace isolation to avoid cross-driver flow collisions.
      // switch_3gang and wall_switch_3gang_1way both expose power-on behavior cards.
      const card = this._getFlowCard(`${P}_set_power_on_behavior`, 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Flow schema uses mode ids: off|on|memory (not previous).
          const validValues = ['off', 'on', 'memory'];
          const behavior = validValues.includes(args.mode) ? args.mode : 'memory';
          // WHY: route through capability listener → DP14 TX + L14 hardening when available.
          if (typeof args.device.triggerCapabilityListener === 'function') {
            await args.device.triggerCapabilityListener('power_on_behavior', behavior);
          } else if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('power_on_behavior', behavior);
          } else {
            await args.device.setCapabilityValue('power_on_behavior', behavior).catch(() => {});
          }
          this.log('[FLOW] Action set_power_on_behavior triggered:', behavior);
          return true;
        });
      }
    } catch (e) { this.error('Action set_power_on_behavior failed:', e.message); }
  }
}

module.exports = TuyaZigbeeDriver;
