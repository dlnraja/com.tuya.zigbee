'use strict';
const{BoundCluster}=require('zigbee-clusters');
class TuyaE002BoundCluster extends BoundCluster{
  constructor({device,onAttributeReport}){super();this._dev=device;this._onAttr=onAttributeReport;}
  log(...a){if(this._dev?.log)this._dev.log('[E002-BOUND]',...a);else console.log('[E002-BOUND]',...a);}
  attr_report(a){try{this.log('attr:',JSON.stringify(a));if(this._onAttr)this._onAttr(a);}catch(e){this.log('ERR:',e.message);}}
  async handleFrame(f,m,r){try{const c=f?.cmdId??f?.commandId;this.log('frame cmd=0x'+(c?.toString(16)||'?'));if(f?.data&&this._onAttr){const d=f.data;const attrs={};if(Buffer.isBuffer(d)&&d.length>=4){const id=d.readUInt16BE(0),val=d.readUInt16BE(2);if(id===0xD00A)attrs.alarmTemperatureMax=val;if(id===0xD00B)attrs.alarmTemperatureMin=val;if(id===0xD00C)attrs.alarmHumidityMax=val;if(id===0xD00E)attrs.alarmHumidityMin=val;}if(Buffer.isBuffer(d)&&d.length>=3){const id=d.readUInt16BE(0),val=d[2];if(id===0xD00F)attrs.alarmHumidity=val;if(id===0xD006)attrs.temperatureHumidityAlarm=val;}if(Object.keys(attrs).length>0)this._onAttr(attrs);}return null;}catch(e){this.log('FRAME SAVED:',e.message);return null;}}
}
module.exports=TuyaE002BoundCluster;


