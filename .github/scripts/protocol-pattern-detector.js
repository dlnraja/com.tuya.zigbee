#!/usr/bin/env node
"use strict";
const KB=require("./bug-knowledge-base");
function detectIssueType(stderr,stdout,driver,settings){
const combined=(stderr||"")+" "+(stdout||"")+" "+(driver||"")+" "+JSON.stringify(settings||{});
const issues=[];
for(const p of KB.CRITICAL_PATTERNS){
if(p.rx.test(combined)){
issues.push({type:p.id,pattern:p.rx.toString(),fix:p.fix,priority:"critical",...p});
}
}
const protocol=KB.PROTOCOL_PATTERNS.filter(p=>p.rx.test(combined)).map(p=>p.protocol);
if(protocol.includes("hybrid")||protocol.includes("ias")&&protocol.includes("tuya_dp")){
issues.push({type:"timing_critical",fix:"IAS+Tuya hybrid - setup DP listeners before magic packet",priority:"high",protocol:"hybrid"});
}
if(/NO_VALUES|no.*data|not.*reporting|stuck.*value/i.test(combined)){
if(driver&&driver.includes("radar"))issues.push({type:"radar_no_values",fix:"Magic packet timing + forced DP poll required",priority:"critical",file:"presence_sensor_radar/device.js"});
if(driver&&driver.includes("sensor"))issues.push({type:"sensor_stuck",fix:"Check DP mappings + divisor settings",priority:"high"});
}
if(/getDeviceConditionCard|getConditionCard.*not.*function/i.test(combined)){
issues.push({type:"sdk_v3_incompatible",fix:"Remove manual flow card registration - SDK v3 auto-registers from driver.flow.compose.json",priority:"critical",action:"remove_flow_registration"});
}
if(/Invalid Flow Card ID/i.test(combined)){
const cardMatch=combined.match(/Invalid Flow Card ID:\s*(\S+)/);
const cardId=cardMatch?cardMatch[1]:null;
issues.push({type:"flow_card_mismatch",fix:"Flow card ID in driver.js not defined in driver.flow.compose.json",priority:"high",cardId,action:"check_flow_compose"});
}
if(/impossible.*add|can.*t.*pair|device.*not.*found/i.test(combined)){
issues.push({type:"pairing_failure",fix:"Check manufacturerName exists in driver but productId may be missing",priority:"high",action:"add_productid"});
}
return{issues,protocol:protocol.length?protocol[0]:"unknown",severity:issues.some(i=>i.priority==="critical")?"critical":"normal"};
}
function generateFixSuggestion(issue,driver,fingerprint){
const suggestions=[];
switch(issue.type){
case"sdk_v3_incompatible":
suggestions.push({file:driver+"/driver.js",action:"delete_lines",pattern:/homey\.flow\.get.*Card/,description:"Remove SDK v2 flow card registrations"});
break;
case"missing_productid":
suggestions.push({file:driver+"/driver.compose.json",action:"add_productid",fingerprint,description:"Add missing productId to zigbee.productId array"});
break;
case"radar_no_values":
suggestions.push({file:"presence_sensor_radar/device.js",action:"reorder_init",description:"Move _setupTuyaDPListeners() before _sendTuyaMagicPacket()"});
suggestions.push({file:"presence_sensor_radar/device.js",action:"add_forced_poll",description:"Add _requestDPRefresh() after magic packet with 3s delay"});
break;
case"flow_card_mismatch":
suggestions.push({file:driver+"/driver.flow.compose.json",action:"add_flow_card",cardId:issue.cardId,description:"Add missing flow card definition"});
break;
}
return suggestions;
}
module.exports={detectIssueType,generateFixSuggestion,KB};
