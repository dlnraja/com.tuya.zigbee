const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDriver extends ZigBeeDriver {
    async onNodeInit({ node }) {
        await super.onNodeInit({ node });
    }
}

module.exports = TuyaDriver;