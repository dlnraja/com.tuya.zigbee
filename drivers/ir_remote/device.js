'use strict';

const Homey = require('homey');
const IRCodeLibrary = require('../../lib/ir/IRCodeLibrary');
const { getRouter } = require('../../lib/ir/IntelligentIRRouter');

/**
 * Virtual IR Remote — P2487: binds to Zigbee ir_blaster/blaster_remote OR wifi_ir_remote.
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
          if (value) {
            this.log('[IR] ir_learn ON → sender learn mode (30s)');
            await this._router.learn({
              device: sender.device,
              name: 'learned_power',
              timeout: 30,
              confirm: true,
            });
          } else if (typeof sender.device._disableLearnMode === 'function') {
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

  async onCapabilityOnOff(value) {
    const brand = this.getSetting('ir_brand');
    const category = this.getSetting('ir_category');
    // Toolkit-style dual map: prefer Power On / Power Off learned names when present
    const onName = this.getSetting('ir_power_on_name') || 'Power On';
    const offName = this.getSetting('ir_power_off_name') || 'Power Off';
    const toggleName = this.getSetting('ir_power_toggle_name') || 'Power';

    try {
      const sender = this._resolveSender();
      if (sender) {
        const map = await this._router.getLearnedMap(sender.device);
        const want = value ? onName : offName;
        if (map[want] && map[want].code) {
          await this._router.send({ device: sender.device, learnedName: want });
          return true;
        }
        if (map[toggleName] && map[toggleName].code) {
          await this._router.send({ device: sender.device, learnedName: toggleName });
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
    if (!sender || !sender.device) {
      throw new Error('Associated IR sender not found. Repair and pick Zigbee or WiFi blaster.');
    }

    try {
      await this._router.send({
        device: sender.device,
        brand,
        category,
        command,
      });
      return true;
    } catch (libErr) {
      // Fallback: learned key brand_category_command
      const map = await this._router.getLearnedMap(sender.device);
      const key = `${brand}_${category}_${command}`;
      if (map[key] && map[key].code) {
        await this._router.send({ device: sender.device, learnedName: key });
        return true;
      }
      // Legacy string store
      const learnedCodes = sender.device.getStoreValue?.('learned_codes') || sender.device._learnedCodes || {};
      const legacy = learnedCodes[key];
      const code = typeof legacy === 'string' ? legacy : legacy?.code;
      if (code) {
        await this._router.send({ device: sender.device, code });
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
