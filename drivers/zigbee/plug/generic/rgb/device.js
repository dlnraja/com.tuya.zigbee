// Enhanced by Mega Ultimate Bug Fixer
// Device Type: tuya
// Category: lights
// Subcategory: rgb
// Enrichment Date: 2025-08-07T17:53:54.817Z

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class RgbDevice extends ZigBeeDevice
  async onNodeInit(args){ try{ if (typeof this.onMeshInit==='function') await this.onMeshInit(); } catch(e){ this.error && this.error('onNodeInit wrapper', e); } }
 {
    async onMeshInit() {
    // Enable debugging
    this.enableDebug();
    
    // Print the node when it is included
    this.printNode();
    
        this.log('🚀 rgb - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = RgbDevice;