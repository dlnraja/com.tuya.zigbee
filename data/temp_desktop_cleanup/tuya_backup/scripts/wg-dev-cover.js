const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}
w('wifi_cover/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
const MAP={open:'up',close:'down',stop:'idle'};
const RMAP={up:'open',idle:'stop',down:'close'};
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'windowcoverings_state',writable:true,transform:v=>MAP[v]||'idle',reverseTransform:v=>RMAP[v]||'stop'},
'2':{capability:'windowcoverings_set',writable:true,transform:v=>v/100,reverseTransform:v=>Math.round(v*100)},
}}}
module.exports=D;
`);
console.log('done');
