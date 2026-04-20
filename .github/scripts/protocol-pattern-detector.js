#!/usr/bin/env node
"use strict";
const KB=require('./bug-knowledge-base');
function detectIssueType(stderr,stdout,driver,settings,fingerprint){
const combined=(stderr||"")+" "+(stdout||"")+" "+(driver||"")+" "+JSON.stringify(settings||{})+" "+(fingerprint||"");
const issues=[];
for(const p of KB.CRITICAL_PATTERNS){if(p.rx.test(combined)){issues.push({type:p.id,pattern:p.rx.toString(),fix:p.fix,priority:p.severity||"critical",action:p.action,file:p.file,...p});}}
const protocol=KB.detectProtocol(combined,driver);
if(protocol.critical_timing){issues.push({type:"timing_critical",fix:"IAS+Tuya unified - setup DP listeners before magic packet",priority:"critical",protocol:protocol.type,requires:protocol.requires});}
if(/NO_VALUES|no.*data|not.*reporting|stuck.*value/i.test(combined)){
if(driver&&driver.includes("radar"))issues.push({type:"radar_no_values",fix:"Magic packet timing + forced DP poll + IAS enrollment retry",priority:"critical",file:"presence_sensor_radar/device.js"});
if(driver&&driver.includes("sensor"))issues.push({type:"sensor_stuck",fix:"Check dpMappings divisor + ProductValueValidator ranges",priority:"high"});
}
for(const bug of KB.COMMON_BUGS){if(combined.toLowerCase().includes(bug.bug.toLowerCase())){issues.push({type:bug.bug.replace(/ /g,"_"),fix:bug.fix,priority:"medium",pattern:bug.pattern});}}
const driverPatterns=KB.getDriverPatterns(driver?.split("_")[0]);
if(driverPatterns){issues.push({type:"driver_specific_check",patterns:driverPatterns.patterns,timing:driverPatterns.timing,mixins:driverPatterns.mixins,priority:"info"});}
return{issues,protocol:protocol.type||"unknown",severity:issues.some(i=>i.priority==="critical")?"critical":issues.some(i=>i.priority==="high")?"high":"normal",recommendations:issues.filter(i=>i.action).map(i=>({action:i.action,fix:i.fix,file:i.file}))};
}
function generateFixSuggestion(issue,driver,fingerprint,productId){
const suggestions=[];
switch(issue.type){
case"sdk_v3_flow":case"sdk_v3_incompatible":
suggestions.push({file:driver+"/driver.js",action:"delete_lines",pattern:/homey\.flow\.get.*Card.*registerRunListener/g,description:"Remove SDK v2 flow card registrations - SDK v3 auto-registers"});
break;
case"missing_productid":
suggestions.push({file:driver+"/driver.compose.json",action:"add_to_array",path:"zigbee.productId",value:productId,description:"Add missing productId: "+productId});
break;
case"radar_no_values":
suggestions.push({file:"presence_sensor_radar/device.js",action:"reorder_init",lines:"2388-2405",description:"Move _setupTuyaDPListeners() BEFORE _sendTuyaMagicPacket()"});
suggestions.push({file:"presence_sensor_radar/device.js",action:"add_forced_poll",after:"magic_packet",delay:"3000ms",description:"Add await _requestDPRefresh(zclNode) after magic packet"});
break;
case"invalid_flow_card":case"flow_card_mismatch":
suggestions.push({file:driver+"/driver.flow.compose.json",action:"add_flow_card",cardId:issue.cardId,description:"Add missing flow card definition for: "+issue.cardId});
break;
case"settings_keys":
suggestions.push({file:driver+"/device.js",action:"rename_settings",from:"zb_modelId",to:"zb_model_id",description:"Fix settings key: use underscore not camelCase"});
suggestions.push({file:driver+"/device.js",action:"rename_settings",from:"zb_manufacturerName",to:"zb_manufacturer_name",description:"Fix settings key: use underscore not camelCase"});
break;
case"battery_mains":
suggestions.push({file:driver+"/device.js",action:"add_getter",code:"get mainsPowered() { return true; }",description:"Mark device as mains-powered"});
suggestions.push({file:driver+"/device.js",action:"remove_capability",capability:"measure_battery",in:"onNodeInit",description:"Remove battery capability for mains-powered device"});
break;
case"titleformatted_bug":
suggestions.push({file:driver+"/driver.flow.compose.json",action:"remove_field",field:"titleFormatted",in:"triggers",description:"Remove titleFormatted - use title field instead"});
break;
case"backlight_strings":
suggestions.push({file:driver+"/device.js",action:"fix_enum_type",field:"backlight_mode",type:"string",values:["off","normal","inverted"],description:"Backlight values must be strings not numbers"});
break;
}
return suggestions;
}
function analyzeDriverCompatibility(driver,protocol,fingerprint){
const compat={compatible:true,warnings:[],required_changes:[]};
const drvType=driver?.split("_")[0];
const protocolDrivers=KB.PROTOCOL_PATTERNS.find(p=>p.protocol===protocol.type)?.drivers||[];
if(protocolDrivers.length&&!protocolDrivers.some(d=>driver?.includes(d))){compat.warnings.push("Driver "+driver+" may not match protocol "+protocol.type+". Expected: "+protocolDrivers.join(", "));}
const drvPatterns=KB.getDriverPatterns(drvType);
if(drvPatterns){
if(protocol.requires){for(const req of protocol.requires){if(!drvPatterns.patterns?.includes(req)){compat.required_changes.push("Add "+req+" support to "+driver);}}}
if(protocol.critical_timing&&!drvPatterns.timing){compat.warnings.push("Driver requires timing patterns but none defined");}
}
return compat;
}
module.exports={detectIssueType,generateFixSuggestion,analyzeDriverCompatibility,KB};
