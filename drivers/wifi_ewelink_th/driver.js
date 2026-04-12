'use strict';
const EweLinkLocalDriver=require('../../lib/ewelink-local/EweLinkLocalDriver');
class D extends EweLinkLocalDriver{async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
await super.onInit();this.log('[EWE-TH-DRV] Ready');}}
module.exports=D;

