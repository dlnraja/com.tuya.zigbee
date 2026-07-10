const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function d(id,cls,tag,mp,ff,sf){
const code=`'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class ${cls} extends TuyaLocalDevice {
  get dpMappings() {
    return ${JSON.stringify(mp).replace(/"_BOOL_"/g,'(v) => v === true || v === 1').replace(/"_RBOOL_"/g,'(v) => v === true')};
  }
  async onInit() {
    await super.onInit();
    this._setupFlows();
    this.log('[${tag}] Ready');
  }
  _setupFlows() {
    const cf = this.homey.flow;
${sf||''}  }
  _fireFlowTriggers(changes) {
    const cf = this.homey.flow;
${ff||''}  }
}
module.exports = ${cls};
`;
fs.writeFileSync(p.join(B,id,'device.js'),code);
console.log(id);}
module.exports=d;
