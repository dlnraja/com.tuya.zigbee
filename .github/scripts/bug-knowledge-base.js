module.exports={
CRITICAL_PATTERNS:[
{id:"sdk_v3_flow",rx:/getDeviceConditionCard|getConditionCard.*not a function/i,fix:"Remove manual flow card registration - SDK v3 auto-registers from driver.flow.compose.json",drivers:["air_quality_comprehensive","din_rail_meter","energy_meter_3phase","lcdtemphumidsensor","pet_feeder","power_clamp_meter","power_meter","temphumidsensor","usb_dongle_triple"],action:"remove_flow_card_registration"},
{id:"radar_timing",rx:/presence.*no values|radar.*not working|_TZ321C_fkzihaxe8/i,fix:"Setup DP listeners BEFORE magic packet + force DP poll after 3s delay",file:"presence_sensor_radar/device.js",action:"reorder_init_sequence",severity:"critical"},
{id:"missing_productid",rx:/impossible to add|can.t pair|device not found/i,fix:"Check manufacturerName exists but productId missing from zigbee.productId array",action:"add_productid",severity:"high"},
{id:"invalid_flow_card",rx:/Invalid Flow Card ID/i,fix:"Flow card ID in driver.js not defined in driver.flow.compose.json",action:"add_flow_definition",severity:"high"},
{id:"settings_keys",rx:/zb_modelId|zb_manufacturerName/i,fix:"Settings keys MUST be: zb_model_id, zb_manufacturer_name (underscore not camelCase)",action:"fix_settings_keys",severity:"critical"},
{id:"double_division",rx:/temp.*0\.2|sensor.*wrong.*value|divisor.*twice/i,fix:"TuyaEF00Manager skips auto-convert when dpMappings has divisor !== 1 (fixed v5.11.15)",file:"lib/tuya/TuyaEF00Manager.js:1912",severity:"critical"},
{id:"battery_mains",rx:/battery.*mains|powered.*battery.*alert/i,fix:"Set mainsPowered=true and remove measure_battery in onNodeInit",action:"remove_battery_capability",severity:"medium"},
{id:"titleformatted_bug",rx:/manual device selection|titleFormatted.*device/i,fix:"NEVER use titleFormatted with [[device]] in triggers - causes manual selection bug",action:"remove_titleformatted",severity:"high"},
{id:"backlight_strings",rx:/backlight.*number|backlight.*0.*1.*2/i,fix:"Backlight values must be strings: off, normal, inverted (not numbers)",action:"fix_backlight_type",severity:"medium"},
{id:"import_location",rx:/import.*middle.*file|require.*not.*top/i,fix:"Imports MUST be at top of file, never in middle",action:"move_imports_to_top",severity:"medium"}
],
PROTOCOL_PATTERNS:[
{protocol:"ias",rx:/iasZone|ssIasZone|cluster.*1280|occupancy.*detection/i,drivers:["presence_sensor","motion_sensor","door_sensor","smoke_sensor","water_leak"]},
{protocol:"tuya_dp",rx:/cluster.*61184|0xef00|Tuya DP|_TZE[0-9]{3}_/i,drivers:["air_quality","thermostat","curtain","dimmer","pet_feeder"]},
{protocol:"zcl_only",rx:/ZCL.*onOff|genOnOff|cluster.*6\b|BSEED|_TZ3000_(l9brjwau|blhvsaqf|ysdv91bk|hafsqare|e98krvvk|iedbgyxt)/i,drivers:["switch_1gang","switch_2gang","switch_3gang","wall_remote"]},
{protocol:"hybrid",rx:/IAS.*Tuya|Tuya.*IAS|AUTO-OPT|radar.*presence|LeapMMW|_TZ321C_fkzihaxe8/i,drivers:["presence_sensor_radar"],critical_timing:true},
{protocol:"mains_powered",rx:/USB.*powered|mains.*powered|_TZE200_8ygsuhe1/i,remove_battery:true},
{protocol:"energy_monitor",rx:/measure_power|activePower|electricalMeasurement|rmsVoltage|rmsCurrent|TS011F/i,drivers:["plug_energy_monitor"],requires:["configureReporting","electricalMeasurement","metering"]},
{protocol:"fingerbot",rx:/fingerbot|_TZ3210_dse8ogfy|button.push/i,drivers:["fingerbot"],requires:["tuya_cluster_61184","registerCapabilityListener"]}
],
DRIVER_SPECIFIC:[
{type:"switch",patterns:["physical_gang","virtual_button","backlight","power_on_behavior"],timing:["2000ms_app_command_timeout"],mixins:["PhysicalButtonMixin","VirtualButtonMixin","HybridSwitchBase"]},
{type:"sensor",patterns:["dpMappings","divisor","ProductValueValidator","mainsPowered"],validation:["CO2:0-5000","temp:-40-80","humidity:0-100"]},
{type:"radar",patterns:["magic_packet","DP_listeners_first","forced_poll","IAS_enrollment"],timing:["3000ms_after_magic","periodic_enrollment_check"]},
{type:"thermostat",patterns:["TRV","valve_position","heating_setpoint","local_temperature"],clusters:[513,516]},
{type:"curtain",patterns:["window_covering","lift_percentage","tilt"],clusters:[258]}
],
COMMON_BUGS:[
{bug:"Physical button not triggering",fix:"Mark app commands with _appCommandPending flag, check within 2000ms timeout",pattern:"PhysicalButtonMixin"},
{bug:"Sensor values rejected",fix:"Check ProductValueValidator.js min/max ranges, adjust if device uses different scale"},
{bug:"Device shows unknown/unknown",fix:"Verify settings keys: zb_model_id, zb_manufacturer_name (not camelCase)"},
{bug:"Duplicate flow triggers",fix:"Add deduplication in setCapabilityValue with 500ms window"},
{bug:"Import errors",fix:"Move all require() statements to top of file, never in functions"},
{bug:"False battery alerts on mains devices",fix:"Set mainsPowered=true + remove measure_battery capability"}
],
FINGERPRINT_RULES:[
{rule:"manufacturerName can appear in multiple drivers",example:"_TZ3000_abc in switch_1gang AND switch_2gang is NORMAL"},
{rule:"Fingerprint = manufacturerName + productId COMBINED",example:"_TZ3000_abc + TS0001 = switch_1gang, _TZ3000_abc + TS0002 = switch_2gang"},
{rule:"Remove fingerprint ONLY if SAME mfr + SAME productId = WRONG driver",action:"check_productid_first"},
{rule:"BSEED ZCL-only fingerprints",fps:["_TZ3000_l9brjwau","_TZ3000_blhvsaqf","_TZ3000_ysdv91bk","_TZ3000_hafsqare","_TZ3000_e98krvvk","_TZ3000_iedbgyxt"]}
],
getResolution(issue){for(const p of this.CRITICAL_PATTERNS){if(p.rx.test(issue))return p;}for(const b of this.COMMON_BUGS){if(issue.toLowerCase().includes(b.bug.toLowerCase()))return b;}return null;},
detectProtocol(text,driver){const matches=this.PROTOCOL_PATTERNS.filter(p=>p.rx.test(text||"")).map(p=>p.protocol);if(matches.includes("hybrid"))return{type:"hybrid",critical_timing:true,requires:["DP_listeners","magic_packet","IAS_enrollment"]};if(matches.includes("tuya_dp")&&matches.includes("ias"))return{type:"hybrid",critical_timing:true};if(matches.includes("tuya_dp"))return{type:"tuya_dp",requires:["TuyaEF00Manager","dpMappings"]};if(matches.includes("ias"))return{type:"ias",requires:["IAS_enrollment","zone_listeners"]};if(matches.includes("zcl_only"))return{type:"zcl",requires:["standard_clusters"]};if(driver){for(const d of this.DRIVER_SPECIFIC){if(driver.includes(d.type))return{type:d.type,patterns:d.patterns,timing:d.timing,mixins:d.mixins};}}return{type:"unknown"};},
// v5.13.1: Recent fixes for cross-referencing diagnostics
RECENT_FIXES:[
{version:"5.12.3",fixes:["_TZE200_vvmbj46n removed from climate_sensor","_TZE200_kb5noeto moved to presence_sensor_radar","fingerbot cluster 61184 added"]},
{version:"5.12.4",fixes:["BSEED fps kept in wall_switch_4gang_1way","scene mode auto double-trigger fixed"]},
{version:"5.12.5",fixes:["configureReporting for energy monitor power/current/voltage"]},
{version:"5.13.0",fixes:["Full MIME email parsing","Pseudo extraction","YAML cross-ref output"]}
],
getDriverPatterns(driverType){return this.DRIVER_SPECIFIC.find(d=>d.type===driverType)||null;},
validateFingerprint(mfr,pid,proposedDriver){
const warnings=[];let action=null;
// Check BSEED ZCL-only fingerprints
const bseed=this.FINGERPRINT_RULES.find(r=>r.fps);
if(bseed&&bseed.fps.includes(mfr)){
  if(proposedDriver&&!proposedDriver.includes('wall_switch')&&!proposedDriver.includes('switch_'))
    warnings.push('BSEED ZCL-only FP '+mfr+' should be in switch/wall_switch driver');
}
// Check if mfr already exists in another driver with same pid
const{extractFP}=require('./fp-validator');
const DD=require('path').join(__dirname,'..','..','drivers');
const fs2=require('fs');
try{
  for(const d of fs2.readdirSync(DD)){
    if(d===proposedDriver)continue;
    const f=require('path').join(DD,d,'driver.compose.json');
    if(!fs2.existsSync(f))continue;
    const j=JSON.parse(fs2.readFileSync(f,'utf8'));
    const mfrs=j.zigbee?.manufacturerName||[];
    const pids=j.zigbee?.productId||[];
    if(mfrs.includes(mfr)&&pid&&pids.includes(pid))
      warnings.push('CONFLICT: '+mfr+'+'+pid+' already in '+d+' - same mfr+pid in two drivers!');
    else if(mfrs.includes(mfr))
      action=action||'verify_productid';
  }
}catch{}
return{valid:warnings.length===0,warnings,action};
}
};
