'use strict';
const{BoundCluster}=require('zigbee-clusters');
class TuyaE003BoundCluster extends BoundCluster{
  constructor({device,onSceneEvent,onRawFrame}){super();this._dev=device;this._onScene=onSceneEvent;this._onRaw=onRawFrame;}
  log(...a){if(this._dev?.log)this._dev.log('[E003-BOUND]',...a);else console.log('[E003-BOUND]',...a);}
  _hc(name,p){try{this.log(name,JSON.stringify(p));const d = p?.data||p;if(this._onScene)this._onScene({cmd:name,data:d,ts:Date.now()});if(this._onRaw)this._onRaw({cluster:0xE003,cmd:name,data:d,ts:Date.now()});}catch(e){this.log('FRAME SAVED -',name,':',e.message);}}
  cmd0(p){this._hc('cmd0',p);}
  cmd1(p){this._hc('cmd1',p);}
  cmd2(p){this._hc('cmd2',p);}
  cmd3(p){this._hc('cmd3',p);}
  cmd4(p){this._hc('cmd4',p);}
  cmd5(p){this._hc('cmd5',p);}
  cmd6(p){this._hc('cmd6',p);}
  cmdFD(p){this._hc('cmdFD',p);}
  cmdFE(p){this._hc('cmdFE',p);}
  async handleFrame(f,m,r){try{const c=f?.cmdId??f?.commandId;this.log('frame cmd=0x'+(c?.toString(16)||'?'));if(this._onRaw)this._onRaw({cluster:0xE003,cmdId:c,frame:f,meta:m,raw:r,ts:Date.now()});return null;}catch(e){this.log('FRAME SAVED:',e.message);return null;}}
}
module.exports=TuyaE003BoundCluster;


