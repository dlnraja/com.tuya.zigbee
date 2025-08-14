// Enhanced by Mega Ultimate Bug Fixer
// Device Type: tuya
// Category: plugs
// Subcategory: indoor
// Enrichment Date: 2025-08-07T17:53:54.861Z

'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class IndoorDevice extends ZigBeeDevice {
    async onMeshInit() {
    // Enable debugging
    this.enableDebug();
    
    // Print the node when it is included
    this.printNode();
    
        this.log('🚀 indoor - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = IndoorDevice;