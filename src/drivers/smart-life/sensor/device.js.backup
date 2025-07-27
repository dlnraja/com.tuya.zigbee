class SmartLifeSensorDevice extends ZigBeeDevice {
    async onNodeInit() {
        this.homey.log('🚀 Smart Life Sensor Device initialized');
        await this.registerCapabilities();
        this.enableLocalMode();
    }
    
    async registerCapabilities() {
        const capabilities = await this.detectSmartLifeCapabilities();
        for (const capability of capabilities) {
            await this.registerCapability(capability);
        }
    }
    
    async detectSmartLifeCapabilities() {
        const deviceType = this.getData().deviceType || 'sensor';
        return await this.getSmartLifeCapabilities(deviceType);
    }
    
    async getSmartLifeCapabilities(deviceType) {
        const capabilityMap = {
            'sensor': ['measure_temperature', 'measure_humidity', 'measure_pressure'],
            'switch': ['onoff'],
            'light': ['onoff', 'dim', 'light_temperature', 'light_mode'],
            'climate': ['target_temperature', 'measure_temperature'],
            'cover': ['windowcoverings_state', 'windowcoverings_set'],
            'lock': ['lock_state', 'lock_mode'],
            'fan': ['onoff', 'dim'],
            'vacuum': ['onoff', 'vacuumcleaner_state'],
            'alarm': ['alarm_contact', 'alarm_motion', 'alarm_tamper'],
            'media_player': ['onoff', 'volume_set', 'volume_mute']
        };
        return capabilityMap[deviceType] || ['measure_temperature'];
    }
    
    enableLocalMode() {
        this.homey.log('✅ Smart Life Local Mode enabled');
        this.isLocalMode = true;
        this.apiEnabled = false;
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        this.homey.log('⚙️ Smart Life settings updated');
    }
    
    async onDeleted() {
        this.homey.log('🗑️ Smart Life device deleted');
    }
}

module.exports = SmartLifeSensorDevice; 