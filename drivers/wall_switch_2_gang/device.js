'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { CLUSTER, ZCLDataTypes } = require('zigbee-clusters');

class wall_switch_2_gang extends UnifiedSwitchBase {

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondSwitch' ? 2 : 1,
        });

        try {
            const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
            this.log("Indicator Mode supported by device");
            await this.setSettings({
              indicator_mode: String(ZCLDataTypes?.enum8IndicatorMode?.args?.[0]?.[indicatorMode?.indicatorMode] ?? indicatorMode?.indicatorMode ?? '')
            });
        } catch (error) {
        this.log("This device does not support Indicator Mode", error);
        }

        if (!this.isSubDevice() && zclNode?.endpoints?.[1]?.clusters?.basic) {
            await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

    }

    onDeleted(){
      super.onDeleted();
		this.log("2 Gang Wall Switch, channel ", (this.getData() || {}).subDeviceId, " removed") // P3065: was undefined -> ReferenceError in onDeleted
	}

    async onSettings({oldSettings, newSettings, changedKeys}) {
        let parsedValue = 0;
        if (changedKeys.includes('indicator_mode')) {
          parsedValue = parseInt(newSettings.indicator_mode);
          await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
        }
    }

}

module.exports = wall_switch_2_gang;
return module.exports;
});
