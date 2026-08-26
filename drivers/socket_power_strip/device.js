'use strict';

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');
const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

class socket_power_strip extends TuyaZigbeeDevice {

	async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});

		this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : 1,
        });

		await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
		.catch(err => {
			this.error('Error when reading device attributes ', err);
		});

    // WHY P2274/D009: Nous A11Z (_TZ3210_6cmeijtd+TS011F) — Z2M configureMagicPacket for independent L1/L2/L3
    const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    if (mfr.includes('6cmeijtd') && subDeviceId !== 'socket2' && subDeviceId !== 'socket3') {
      safeSetTimeout(this, async () => {
        try {
          await sendTuyaMagicPacket(this, zclNode, 1, { force: true });
        } catch (_e) { /* sleepy-safe */ }
      }, 2500);
    }

  }

	onDeleted(){
	  super.onDeleted();
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip;