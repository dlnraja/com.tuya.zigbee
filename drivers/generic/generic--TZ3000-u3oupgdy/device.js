const { ZigbeeDevice } = require('homey-meshdriver');

class GenericDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Configuration de base
        this.registerCapability('onoff', 'genOnOff');
        
        // Ajouter d'autres capacités selon les besoins
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 'genLevelCtrl');
        }
        
        if (this.hasCapability('measure_power')) {
            this.registerCapability('measure_power', 'genPowerCfg');
        }
    }
}

module.exports = GenericDevice;
