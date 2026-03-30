'use strict';
const EweLinkLocalDriver=require('../../lib/ewelink-local/EweLinkLocalDriver');
class D extends EweLinkLocalDriver{async onInit(){await super.onInit();this.log('[EWE-TH-DRV] Ready');}}
module.exports=D;

