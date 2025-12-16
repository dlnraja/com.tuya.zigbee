'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * IR Blaster Remote - TS1201 (ZS06, UFO-R11, etc.)
 *
 * Supports learning and sending IR codes via Zigbee.
 *
 * Known manufacturers:
 * - _TZ3290_7v1k4vufotpowp9z (ZS06)
 * - _TZ3290_u9xac5rv
 * - _TZ3290_gnlsafc7
 *
 * Clusters:
 * - 0x0000 (Basic)
 * - 0x0006 (OnOff) - for learn mode toggle
 * - 0xED00 (60672) - IR learning cluster
 * - 0xE004 (57348) - IR code cluster
 */
class IrBlasterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('IR Blaster initializing...');

    // Store zclNode reference
    this._zclNode = zclNode;

    // Get device info
    const { manufacturerName, modelId } = this.getSettings() || {};
    this.log(`Manufacturer: ${manufacturerName}, Model: ${modelId}`);

    // Setup OnOff cluster for learn mode
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      this.log('Setting up OnOff cluster for learn mode...');

      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        this.log(`Learn mode: ${value ? 'ON' : 'OFF'}`);
        this.setCapabilityValue('onoff', value).catch(this.error);
      });

      // Register capability listener
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`Setting learn mode: ${value}`);
        try {
          if (value) {
            await zclNode.endpoints[1].clusters.onOff.setOn();
          } else {
            await zclNode.endpoints[1].clusters.onOff.setOff();
          }
        } catch (err) {
          this.error('Failed to set learn mode:', err);
          throw err;
        }
      });
    }

    // Setup learn IR button
    if (this.hasCapability('button.learn_ir')) {
      this.registerCapabilityListener('button.learn_ir', async () => {
        this.log('Learn IR button pressed - enabling learn mode');
        try {
          await this._enableLearnMode();
        } catch (err) {
          this.error('Failed to enable learn mode:', err);
        }
      });
    }

    // Try to setup IR clusters (proprietary)
    await this._setupIRClusters(zclNode);

    this.log('IR Blaster initialized successfully');
  }

  /**
   * Setup proprietary IR clusters
   */
  async _setupIRClusters(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;

    // Cluster 0xED00 (60672) - IR Learning
    // Cluster 0xE004 (57348) - IR Code

    // Try to bind to these clusters for receiving learned codes
    try {
      // Listen for any cluster frame on the proprietary clusters
      this.log('Setting up IR cluster listeners...');

      // The IR code is typically received via cluster attribute reports
      // or custom commands on clusters 60672/57348

    } catch (err) {
      this.log('IR cluster setup note:', err.message);
    }
  }

  /**
   * Enable IR learning mode
   */
  async _enableLearnMode() {
    this.log('Enabling IR learn mode...');

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // Toggle on the onOff cluster to enable learning
      await zclNode.endpoints[1].clusters.onOff.setOn();
      this.log('Learn mode enabled - point remote at device and press button');

      // Auto-disable after 30 seconds
      this.homey.setTimeout(async () => {
        try {
          await zclNode.endpoints[1].clusters.onOff.setOff();
          this.log('Learn mode auto-disabled after timeout');
        } catch (e) {
          // Ignore
        }
      }, 30000);

    } catch (err) {
      this.error('Failed to enable learn mode:', err);
      throw err;
    }
  }

  /**
   * Send IR code
   * @param {string} irCode - Base64 encoded IR code
   */
  async sendIRCode(irCode) {
    this.log(`Sending IR code: ${irCode.substring(0, 20)}...`);

    const zclNode = this._zclNode;
    if (!zclNode?.endpoints?.[1]) {
      throw new Error('Device not ready');
    }

    try {
      // IR codes are sent via cluster 0xE004 (57348)
      // This is a placeholder - actual implementation depends on cluster definition
      this.log('IR code send requested - implementation pending cluster definition');

    } catch (err) {
      this.error('Failed to send IR code:', err);
      throw err;
    }
  }

  onDeleted() {
    this.log('IR Blaster device deleted');
  }
}

module.exports = IrBlasterDevice;
