'use strict';
const{BoundCluster}=require('zigbee-clusters');
class TuyaE001BoundCluster extends BoundCluster{
constructor({device,onAttributeReport}){super();this._dev=device;this._onAttr=onAttributeReport;}
log(...a){if(this._dev?.log)this._dev.log('[E001-BOUND]',...a);else console.log('[E001-BOUND]',...a);}
attr_report(a){try{this.log('attr:',JSON.stringify(a));if(this._onAttr)this._onAttr(a);}catch(e){this.log('ERR:',e.message);}}
async handleFrame(f,m,r){try{const c=f?.cmdId??f?.commandId;this.log('frame cmd=0x'+(c?.toString(16)||'?'));if(f?.data&&this._onAttr){const d=f.data;const attrs={};if(Buffer.isBuffer(d)&&d.length>=3){const id=d.readUInt16BE(0),val=d[2];if(id===0xD010)attrs.powerOnBehavior=val;if(id===0xD030)attrs.switchMode=val;if(id===0xD011)attrs.tuyaMagic=val;}if(Object.keys(attrs).length>0)this._onAttr(attrs);}return null;}catch(e){this.log('FRAME SAVED:',e.message);return null;}}
}
module.exports=TuyaE001BoundCluster;
