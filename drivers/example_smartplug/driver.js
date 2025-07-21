'use strict';

const { Driver } = require('homey');

class SmartPlugDriver extends Driver {
  async onInit() {
    this.log('Smart Plug driver initialized');
  }
  
  async onPairListDevices() {
    // Cette méthode est appelée lors du jumelage
    // Elle devrait renvoyer un tableau d'appareils
    return [
      {
        name: 'Smart Plug',
        data: {
          id: 'example_smartplug',
        },
      },
    ];
  }
}

module.exports = SmartPlugDriver;
