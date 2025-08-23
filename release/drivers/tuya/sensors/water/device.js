// Enhanced by Mega Ultimate Bug Fixer
// Device Type: tuya
// Category: sensors
// Subcategory: water
// Enrichment Date: 2025-08-07T17:53:54.979Z

'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class WaterDevice extends ZigBeeDevice {
    async onMeshInit() {
    // Enable debugging
    this.enableDebug();
    
    // Print the node when it is included
    this.printNode();
    
        this.log('🚀 water - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = WaterDevice;