'use strict';
const { safeDivide } = require('../utils/tuyaUtils.js');
const Homey=require('homey');
const EweLinkLANClient=require('./EweLinkLANClient');
const CapabilityManagerMixin = require('../mixins/CapabilityManagerMixin');
const CoreCapabilityMixin = require('../mixins/CoreCapabilityMixin');

class EweLinkLocalDevice extends Homey.Device{
  async onInit(){
    this.log('[EWE] Init eWeLink local device (Omni-Fusion v7.0)');
    // v7.0.0: Apply Omni-Fusion Mixins
    Object.assign(this, CapabilityManagerMixin);
    Object.assign(this, CoreCapabilityMixin);
    
    const s=this.getSettings();
    this._deviceId=s.device_id||this.getData().id;
    this._apiKey=s.api_key||'';
    this._ip=s.ip||null;
    this._encrypt=s.encrypt!==false;
    this._prevCaps={};

    if(!this._deviceId){this.setUnavailable('Missing device_id').catch(()=>{});return;}

    this._client=new EweLinkLANClient({deviceId:this._deviceId,apiKey:this._apiKey,ip:this._ip,encrypt:this._encrypt,log:this.log.bind(this)});
    this._client.on('connected',()=>{this.setAvailable().catch(()=>{});this.log('[EWE] Online');
      });
    this._client.on('state-update',(data)=>this._processState(data));
    this._client.on('error',(e)=>{this.log('[EWE] Error:'+e.message);this.setUnavailable('Disconnected').catch(()=>{});
      });
    this._registerCapListeners();
    if(this._ip)try{await this._client.connect();}catch(e){this.log('[EWE] Init connect fail:'+e.message);this.setUnavailable('Connection failed').catch(()=>{});}
    else this.setUnavailable('No IP - configure in settings').catch(()=>{});
    this.log('[EWE] Init done');
  }

  get stateMappings(){return{};}

  _processState(data){
    const m=this.stateMappings;
    for(const[key,cfg]of Object.entries(m)){
      let val=data[key];
      if(val===undefined)continue;
      if(typeof cfg.transform==='function')val=cfg.transform(val);
      else if(cfg.divisor&&typeof val==='number')val=safeDivide(val, cfg.divisor);
      if(val!==null&&val!==undefined&&cfg.capability){
        // v7.0.0: Use Omni-Fusion _safeSetCapability (BVB + Throttling + Calibration)
        if (this._safeSetCapability) {
            this._safeSetCapability(cfg.capability, val).catch(this.error);
        } else {
            this.setCapabilityValue(cfg.capability, val).catch(this.error);
        }
        this.log('[EWE] '+key+' -> '+cfg.capability+' = '+val);
        this._prevCaps[cfg.capability]=val;
      }
    }
    // Handle switches array
    if(data.switches&&Array.isArray(data.switches)){
      for(const sw of data.switches){
        const cap=m['switch_'+sw.outlet];
        if(cap&&cap.capability){
          const v=sw.switch==='on';
          this.setCapabilityValue(cap.capability,v).catch(this.error);
          this._prevCaps[cap.capability]=v;
        }
      }
    }
  }

  _registerCapListeners(){
    // Override in subclass
  }

  async onSettings({oldSettings,newSettings,changedKeys}){
    const reconnect=['ip','api_key','device_id','encrypt'];
    if(changedKeys.some(k=>reconnect.includes(k))){
      this.log('[EWE] Settings changed, reconnecting');
      if(this._client){await this._client.destroy();this._client=null;}
      this._prevCaps={};
      await this.onInit();
    }
  }

  onDiscoveryResult(dr){return dr.id===this._deviceId;}
  async onDiscoveryAvailable(dr){this._onDiscoveryIP(dr);}
  onDiscoveryAddressChanged(dr){this._onDiscoveryIP(dr);}
  onDiscoveryLastSeenChanged(dr){}
  _onDiscoveryIP(dr){
    if(dr.address&&dr.address!==this._ip){
      this.log('[EWE] mDNS IP update:',this._ip,'->',dr.address);
      this._ip=dr.address;
      if(this._client){this._client.updateIP(dr.address);this._client.connect().catch(()=>{});}
      this.setSettings({ip:dr.address}).catch(()=>{});
    }
  }

  async onDeleted(){
    this.log('[EWE] Deleted');
    if(this._client)await this._client.destroy();
  }
}

module.exports=EweLinkLocalDevice;
