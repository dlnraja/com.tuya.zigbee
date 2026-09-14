'use strict';

const Homey = require('homey');
const IRCodeLibrary = require('../../lib/ir/IRCodeLibrary');
const { getRouter, HOMEY_IR_SENDER_ID } = require('../../lib/ir/IntelligentIRRouter');

/**
 * Virtual IR Remote — P2487: Zigbee / WiFi blaster OR Homey Pro 2023 onboard IR TX.
 * Learned codes for Homey path live on this device store (Homey radio has no learn).
 */
class IrRemoteDevice extends Homey.Device {

  onInit() {
    this.log('Virtual IR Remote initialized (P2487 multi-sender)');
    this._router = getRouter(this.homey);

    this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));

    if (this.hasCapability('button.ir_test')) {
      this.registerCapabilityListener('button.ir_test', async () => {
        this.log('[IR] button.ir_test → Power via router');
        try {
          await this._sendRemoteCommand(this.getSetting('ir_brand'), this.getSetting('ir_category'), 'Power');
        } catch (e) {
          this.log(`[IR] ir_test failed: ${e.message}`);
        }
        return true;
      });
    }

    if (this.hasCapability('onoff.ir_learn')) {
      this.registerCapabilityListener('onoff.ir_learn', async (value) => {
        try {
          const sender = this._resolveSender();
          if (!sender) throw new Error('Associated IR sender not found');
          if (sender.transport === 'homey') {
            throw new Error('Homey onboard IR is TX-only — learn on Zigbee/WiFi, paste Pronto, or store manual');
          }
          if (value) {
            this.log('[IR] ir_learn ON → sender learn mode (30s)');
            await this._router.learn({
              device: sender.device,
              name: 'learned_power',
              timeout: 30,
              confirm: true,
            });
          } else if (sender.device && typeof sender.device._disableLearnMode === 'function') {
            await sender.device._disableLearnMode();
          }
        } catch (e) {
          this.log(`[IR] ir_learn failed: ${e.message}`);
        }
        return true;
      });
    }

    this._initializeExtraCapabilities();
  }

  _resolveSender() {
    const settings = this.getSettings() || {};
    return this._router.resolveTransportFromSettings(settings);
  }

  /** Store for learned map: physical blaster, or this virtual remote when Homey TX. */
  _storeDevice(sender) {
    if (!sender) return this;
    if (sender.transport === 'homey' || !sender.device) return this;
    return sender.device;
  }

  _sendOpts(extra = {}) {
    const sender = this._resolveSender();
    if (!sender) return null;
    const storeDevice = this._storeDevice(sender);
    if (sender.transport === 'homey') {
      return {
        senderId: HOMEY_IR_SENDER_ID,
        storeDevice,
        device: storeDevice,
        ...extra,
      };
    }
    return {
      device: sender.device,
      storeDevice,
      ...extra,
    };
  }

  async onCapabilityOnOff(value) {
    const brand = this.getSetting('ir_brand');
    const category = this.getSetting('ir_category');
    const onName = this.getSetting('ir_power_on_name') || 'Power On';
    const offName = this.getSetting('ir_power_off_name') || 'Power Off';
    const toggleName = this.getSetting('ir_power_toggle_name') || 'Power';

    try {
      const sender = this._resolveSender();
      if (sender) {
        const map = await this._router.getLearnedMap(this._storeDevice(sender));
        const want = value ? onName : offName;
        if (map[want] && map[want].code) {
          await this._router.send(this._sendOpts({ learnedName: want }));
          return true;
        }
        if (map[toggleName] && map[toggleName].code) {
          await this._router.send(this._sendOpts({ learnedName: toggleName }));
          return true;
        }
      }
    } catch (e) {
      this.log(`[IR] onoff learned path: ${e.message}`);
    }

    return this._sendRemoteCommand(brand, category, toggleName);
  }

  async _sendRemoteCommand(brand, category, command) {
    const sender = this._resolveSender();
    if (!sender || (sender.transport !== 'homey' && !sender.device)) {
      throw new Error('Associated IR sender not found. Pick Zigbee, WiFi, or Homey onboard IR.');
    }
    if (sender.transport === 'homey' && sender.available === false) {
      throw new Error('Homey onboard IR not available on this Homey');
    }

    const storeDevice = this._storeDevice(sender);
    try {
      await this._router.send(this._sendOpts({ brand, category, command }));
      return true;
    } catch (libErr) {
      const map = await this._router.getLearnedMap(storeDevice);
      const key = `${brand}_${category}_${command}`;
      if (map[key] && map[key].code) {
        await this._router.send(this._sendOpts({ learnedName: key }));
        return true;
      }
      const learnedCodes = storeDevice.getStoreValue?.('learned_codes') || storeDevice._learnedCodes || {};
      const legacy = learnedCodes[key];
      const code = typeof legacy === 'string' ? legacy : legacy?.code;
      if (code) {
        await this._router.send(this._sendOpts({ code }));
        return true;
      }
      throw libErr;
    }
  }

  _initializeExtraCapabilities() {
    const category = this.getSetting('ir_category');
    if (category === 'TV') {
      // volume/channel handled via flow cards on physical sender
    } else if (category === 'AC') {
      // AC long frames: learn-only (no invent state synthesizer)
    }
  }
}

module.exports = IrRemoteDevice;
