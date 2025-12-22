'use strict';

const EPOCH_2000_DELTA = 946684800;

class TuyaEpochDetector {

  constructor(device, timeManager) {
    this.device = device;
    this.timeManager = timeManager;
    this.detected = null;
    this.requestCount = 0;
  }

  attachListeners() {
    for (const epId in this.device.node.endpoints) {
      const ep = this.device.getEndpoint(epId);
      const cluster = ep?.clusters?.[0xEF00];
      if (!cluster) continue;

      cluster.on('command', frame => {
        if (frame.commandIdentifier === 0x24) {
          this.requestCount++;
          this.device.log('[EpochDetect] Time request detected');
        }
      });
    }
  }

  async detect() {
    this.attachListeners();

    this.device.log('[EpochDetect] Trying Epoch 1970');
    await this.timeManager.sync({ useEpoch2000: false, retries: 1 });

    await this._sleep(800);

    if (this.requestCount === 0) {
      this.detected = false;
      return false;
    }

    this.device.log('[EpochDetect] Trying Epoch 2000');
    this.requestCount = 0;

    await this.timeManager.sync({ useEpoch2000: true, retries: 1 });
    await this._sleep(800);

    if (this.requestCount === 0) {
      this.detected = true;
      return true;
    }

    // Fallback : 1970 (90% des TS0601)
    this.detected = false;
    return false;
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = TuyaEpochDetector;
