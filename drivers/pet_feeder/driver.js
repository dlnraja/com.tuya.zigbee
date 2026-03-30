'use strict';
const { Driver } = require('homey');
class PetFeederDriver extends Driver {
  async onInit() {
    this.log('Pet Feeder driver initialized');
    // v5.13.3: Flow card handlers
    try{this.homey.flow.getActionCard('pet_feeder_feed_now').registerRunListener(async({device})=>{if(typeof device.feedNow==='function')await device.feedNow();return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}
module.exports = PetFeederDriver;
