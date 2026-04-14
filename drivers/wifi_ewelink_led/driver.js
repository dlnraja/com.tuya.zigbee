'use strict';
const EweLinkLocalDriver=require('../../lib/ewelink-local/EweLinkLocalDriver');
class D extends EweLinkLocalDriver{async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
this.log('[EWE-LED-DRV] Ready');
  
  
  }}
module.exports=D;

