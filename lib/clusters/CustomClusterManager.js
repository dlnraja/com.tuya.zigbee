'use strict';

// CustomClusterManager v5.8.36
// Discovers, binds, listens to custom clusters Homey skips during interview
// 0xEF00-0xEFFF (Tuya) on ALL EPs + 0xFC00-0xFFFF (manufacturer-specific)

class CustomClusterManager {
  constructor(device) {
    this.device = device;
    this.log = (...a) => device.log('[CCM]', ...a);
    this._clusters = new Map();
    this._attrs = new Map();
    this._listeners = [];
  }
  async initialize(zclNode) {
    if (!zclNode || !zclNode.endpoints) return 0;
    this.log('Scanning all endpoints for custom/skipped clusters...');
    const eps = Object.keys(zclNode.endpoints);
    let total = 0;
    for (const epId of eps) {
      const ep = zclNode.endpoints[epId];
      if (!ep || !ep.clusters) continue;
      total += this._scanEndpoint(ep, parseInt(epId));
    }
    this.log('Found ' + total + ' custom clusters across ' + eps.length + ' EPs');
    if (total > 0) await this._bindAll();
    return total;
  }

  _scanEndpoint(ep, epId) {
    const clusters = ep.clusters || {};
    let count = 0;
    for (const [name, cluster] of Object.entries(clusters)) {
      const id = this._resolveId(name, cluster);
      if (id === null) continue;
      const isCustom = (id >= 0xEF00 && id <= 0xEFFF) || id >= 0xFC00;
      if (!isCustom) continue;
      const key = id + ':' + epId;
      if (this._clusters.has(key)) continue;
      const type = this._classify(id);
      this._clusters.set(key, { id, epId, name, cluster, type });
      count++;
      this.log('EP' + epId + ': 0x' + id.toString(16).toUpperCase().padStart(4, '0') + ' (' + name + ') [' + type + ']');
    }
    return count;
  }
  _resolveId(name, cluster) {
    if (cluster && cluster.ID !== undefined) return cluster.ID;
    if (cluster && cluster.clusterId !== undefined) return cluster.clusterId;
    const n = parseInt(name);
    if (!isNaN(n) && n > 0) return n;
    if (typeof name === 'string' && name.startsWith('0x')) return parseInt(name, 16);
    const NAMED = {
      tuya: 0xEF00, tuyaSpecific: 0xEF00,
      manuSpecificTuya: 0xEF00, tuyaManufacturer: 0xEF00
    };
    return NAMED[name] || null;
  }

  _classify(id) {
    if (id === 0xEF00) return 'tuya_dp';
    if (id === 0xFCC0 || id === 0xFF01 || id === 0xFF02) return 'xiaomi';
    if (id === 0xFC11 || id === 0xFC7E) return 'tuya_alt';
    return 'mfr_specific';
  }

  async _bindAll() {
    for (const [key, info] of this._clusters) {
      try {
        this._setupListener(info);
      } catch (e) {
        this.log('Bind error ' + key + ': ' + e.message);
      }
    }
  }
  _setupListener(i){
    const{cluster:cl,id,epId,type}=i;
    if(typeof cl.on!=='function')return;
    const ah=(a,v)=>this._onCustomAttr(id,epId,a,v,type);
    cl.on('attr',ah);this._listeners.push({cluster:cl,event:'attr',handler:ah});
    if(type==='tuya_dp'&&epId!==1){
      ['dataReport','dataResponse','response','report','data','set'].forEach(ev=>{
        try{const h=d=>{this.device.emit&&this.device.emit('tuya.dp.alt',{endpoint:epId,event:ev,data:d});};
        cl.on(ev,h);this._listeners.push({cluster:cl,event:ev,handler:h});}catch(e){}});
    }
    // v5.8.38: Disabled deferred read - was causing probe errors on battery/ZCL devices
    // if(type!=='tuya_dp')this._deferredRead(cl,id,epId,type);
  }
  _onCustomAttr(cid,epId,attr,val,type){
    const k=cid+':'+epId+':'+attr;
    const prev=this._attrs.get(k);
    this._attrs.set(k,{value:val,type:typeof val,ts:Date.now(),count:(prev?.count||0)+1});
    this.log('Custom 0x'+cid.toString(16)+' EP'+epId+' '+attr+'='+JSON.stringify(val).slice(0,100));
    if(this.device.emit){
      this.device.emit('custom.cluster.attr',{clusterId:cid,endpoint:epId,attr:attr,value:val,type:type});
    }
    if(type==='tuya_dp'){this.device.emit&&this.device.emit('tuya.dp.custom',{dp:attr,value:val,endpoint:epId});return;}
    // v5.8.38: Discovery-only mode - log but don't auto-map/add capabilities
    // Auto-mapping broke climate sensors, presence sensors (Karsten_Hille, FinnKje forum reports)
    // Dedicated device handlers should use 'custom.cluster.attr' events if needed
  }
  _smartMap(attr,val){
    const a=String(attr).toLowerCase();
    const M={
      temperature:{cap:'measure_temperature',div:100},
      measuredvalue:{cap:'measure_temperature',div:100},
      humidity:{cap:'measure_humidity',div:100},
      relativehumidity:{cap:'measure_humidity',div:100},
      pressure:{cap:'measure_pressure',div:1},
      illuminance:{cap:'measure_luminance',div:1},
      battery:{cap:'measure_battery',div:1},
      batterypercent:{cap:'measure_battery',div:2},
      power:{cap:'measure_power',div:1},
      instantaneousdemand:{cap:'measure_power',div:1},
      rmsvoltage:{cap:'measure_voltage',div:10},
      rmscurrent:{cap:'measure_current',div:1000},
      onoff:{cap:'onoff',div:null},
    };
    let match=M[a];
    if(!match){for(const[k,v]of Object.entries(M)){if(a.includes(k)){match=v;break;}}}
    if(!match)return;
    const cap=match.cap;
    const v=match.div?val/match.div:val;
    if(this.device.hasCapability(cap)){
      this.device.setCapabilityValue(cap,v).catch(()=>{});
      this.log('Mapped '+attr+' -> '+cap+' = '+v);
    }else{
      this._tryAdd(cap,v);
    }
  }
  async _tryAdd(cap,v){
    if(this.device.hasCapability(cap))return;
    try{
      await this.device.addCapability(cap);
      await this.device.setCapabilityValue(cap,v);
      this.log('Auto-added: '+cap+' = '+v);
    }catch(e){this.log('Cannot add '+cap+': '+e.message);}
  }

  _deferredRead(cl,cid,epId,type){
    setTimeout(async()=>{
      try{
        if(typeof cl.discoverAttributes==='function'){
          const attrs=await cl.discoverAttributes().catch(()=>[]);
          if(attrs&&attrs.length>0){
            this.log('0x'+cid.toString(16)+' EP'+epId+' has '+attrs.length+' attrs');
            const ids=attrs.slice(0,8).map(a=>a.id||a);
            const vals=await cl.readAttributes(ids).catch(()=>({}));
            for(const[k,v]of Object.entries(vals||{})){
              this._onCustomAttr(cid,epId,k,v,type);
            }
          }
        }
      }catch(e){}
    },10000);
  }

  getDiscovered(){
    const r=[];
    for(const[k,i]of this._clusters)r.push({key:k,id:i.id,epId:i.epId,name:i.name,type:i.type});
    return r;
  }

  getAttributes(){
    const r={};
    for(const[k,v]of this._attrs)r[k]=v;
    return r;
  }

  destroy(){
    for(const{cluster:c,event:e,handler:h}of this._listeners){
      try{if(c.removeListener)c.removeListener(e,h);}catch(x){}
    }
    this._listeners=[];this._clusters.clear();
  }
}

module.exports = CustomClusterManager;
