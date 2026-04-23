'use strict';
const http=require('http');
const {EventEmitter}=require('events');
const EweLinkCrypto=require('./EweLinkCrypto');
class EweLinkLANClient extends EventEmitter{
  constructor(o){super();this.deviceId=o.deviceId;this.apiKey=o.apiKey;this.ip=o.ip;this.encrypt=o.encrypt!==false;this._connected=false;this._log=o.log||(()=>{});this._lastState={};this._pollTimer=null;this._pollInterval=o.pollInterval||10000;this._destroyed=false;this._seq=Date.now();this._reconnectTimer=null;}
  get connected(){return this._connected;}
  get lastState(){return{...this._lastState};}
  async connect(){if(this._destroyed||!this.ip)return;this._clearReconnect();try{const r=await this._request('/zeroconf/info',{});if(r&&r.error===0){this._connected=true;if(r.data)this._processState(r.data);this._log('[EWE-LAN] Connected '+this.ip);this.emit('connected');this._startPolling();}else throw new Error('err:'+(r?r.error:'null'));}catch(e){this._connected=false;this._log('[EWE-LAN] Fail:'+e.message);this.emit('error',e);this._scheduleReconnect();}}
  async setSwitch(s,outlet){if(outlet!==undefined)return this._send('/zeroconf/switches',{switches:[{switch:s?'on':'off',outlet}]});return this._send('/zeroconf/switch',{switch:s?'on':'off'});}
  async setMultiSwitch(arr){return this._send('/zeroconf/switches',{switches:arr.map((s,i)=>({switch:s?'on':'off',outlet:i}))});}
  async setDimmer(b,s){const d={brightness:Math.max(0,Math.min(100,b))};if(s!==undefined)d.switch=s?'on':'off';return this._send('/zeroconf/dimmable',d);}
  async setPulse(on,w){return this._send('/zeroconf/pulse',{pulse:on?'on':'off',pulseWidth:w||500});}
  async setStartup(m){return this._send('/zeroconf/startup',{startup:m});}
  async _send(p,d){const r=await this._request(p,d);if(r&&r.error===0){if(r.data)this._processState(r.data);return true;}throw new Error('cmd fail:'+JSON.stringify(r));}
  _processState(d){const prev={...this._lastState};Object.assign(this._lastState,d);this.emit('state-update',d,prev);}
  _startPolling(){this._stopPolling();this._pollTimer=setInterval(()=>{if(this._connected)this._request('/zeroconf/info',{}).then(r=>{if(r&&r.data)this._processState(r.data);}).catch(()=>{});},this._pollInterval);}
  _stopPolling(){if(this._pollTimer){clearInterval(this._pollTimer);this._pollTimer=null;}}
  _scheduleReconnect(){if(this._destroyed||this._reconnectTimer)return;this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null;this.connect();},5000);}
  _clearReconnect(){if(this._reconnectTimer){clearTimeout(this._reconnectTimer);this._reconnectTimer=null;}}
  _buildBody(data){const seq=String(this._seq++);const body={deviceid:this.deviceId,data};if(this.encrypt&&this.apiKey){const enc=EweLinkCrypto.encrypt(data,this.apiKey);body.data=enc.data;body.encrypt=true;body.iv=enc.iv;body.sequence=seq;}return JSON.stringify(body);}
  _request(path,data){return new Promise((ok,fail)=>{const body=this._buildBody(data);const opts={hostname:this.ip,port:8081,path,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},timeout:5000};const req=http.request(opts,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d);if(j.data&&j.encrypt&&this.apiKey&&j.iv){j.data=EweLinkCrypto.decrypt(j.data,this.apiKey,j.iv);}ok(j);}catch(e){fail(e);}});
      });req.on('error',fail);req.on('timeout',()=>{req.destroy();fail(new Error('timeout'));
      });req.write(body);req.end();
      });}
  updateIP(ip){this.ip=ip;this._log('[EWE-LAN] IP->'+ip);}
  async disconnect(){this._stopPolling();this._clearReconnect();this._connected=false;}
  async destroy(){this._destroyed=true;await this.disconnect();this.removeAllListeners();}
}
module.exports=EweLinkLANClient;
