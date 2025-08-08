// Total drivers: 1476 (1476 Tuya + Zigbee combined)
'use strict';
const Homey = require('homey');
const fs = require('fs');
const path = require('path');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('🚀 Universal Tuya Zigbee App v3.0.0 - Initialisation MEGA ULTIMATE...');
        this.LOCAL_MODE = true; // Mode 100% local garanti
        this.log('✅ Mode 100% local activé');
