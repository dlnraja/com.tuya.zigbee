'use strict';
const Homey=require('homey');
const { createWiFiConnectionStore } = require('../wifi/WiFiConnectionPolicy');
const { registerEweLinkRepairHandlers } = require('./eweLinkRepair');

class EweLinkLocalDriver extends Homey.Driver{
  async onInit(){this.log('[EWE-DRV] Init');}

  onDiscoveryResult(dr){return dr.id!=null;}
  async onDiscoveryAvailable(dr){this.log('[EWE-DRV] Discovered:',dr.id,dr.address);}
  onDiscoveryAddressChanged(dr){this.log('[EWE-DRV] IP changed:',dr.id,dr.address);}
  onDiscoveryLastSeenChanged(dr){}

  async onPair(session){
    let pairData={};
    session.setHandler('configure',async(data)=>{
      if(!data.device_id){throw new Error('Device ID required');}
      pairData=data;
      return{success:true};
    });
    session.setHandler('list_devices',async()=>{
      const devices=[];
      // Add manually configured device
      if(pairData.device_id){
        devices.push({
          name:pairData.name||`eWeLink ${pairData.device_id.substring(0,8)}`,
          data:{id:pairData.device_id},
          store:createWiFiConnectionStore({pairingMode:'ad_hoc',transport:'lan_mdns',localDiscovery:true}),
          settings:{device_id:pairData.device_id,api_key:pairData.api_key||'',ip:pairData.ip||'',encrypt:pairData.encrypt!==false}
        });
      }
      // Add mDNS discovered devices
      try{
        const results=this.getDiscoveryStrategy().getDiscoveryResults();
        for(const dr of Object.values(results)){
          const id=dr.id;if(!id||devices.some(d=>d.data.id===id)){continue;}
          const txt=dr.txt||{};
          devices.push({
            name:txt.type||`eWeLink ${id.substring(0,8)}`,
            data:{id},
            store:createWiFiConnectionStore({pairingMode:'ad_hoc',transport:'lan_mdns',localDiscovery:true}),
            settings:{device_id:id,api_key:'',ip:dr.address||'',encrypt:true}
          });
        }
      }catch(e){this.log('[EWE-DRV] mDNS scan:',e.message);}
      return devices;
    });
  }

  async onRepair(session,device){
    // P3072: shared with the generated wifi_sonoff_* drivers (lib/ewelink-local/eweLinkRepair.js)
    registerEweLinkRepairHandlers(session,device,{log:(...a)=>this.log(...a)});
  }
}

module.exports = EweLinkLocalDriver;
