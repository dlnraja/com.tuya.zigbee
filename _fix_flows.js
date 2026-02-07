const fs=require('fs'),path=require('path');
const dd=path.join(__dirname,'drivers');
const dirs=fs.readdirSync(dd).filter(d=>fs.statSync(path.join(dd,d)).isDirectory());
let total=0,mod=0;
for(const d of dirs){
const cp=path.join(dd,d,'driver.compose.json'),fp=path.join(dd,d,'driver.flow.compose.json');
if(!fs.existsSync(cp)||!fs.existsSync(fp))continue;
const caps=(JSON.parse(fs.readFileSync(cp,'utf8'))).capabilities||[];
let f;try{f=JSON.parse(fs.readFileSync(fp,'utf8'));}catch(e){continue;}
if(!f.triggers)f.triggers=[];if(!f.conditions)f.conditions=[];if(!f.actions)f.actions=[];
const ids=new Set([...f.triggers.map(x=>x.id),...f.conditions.map(x=>x.id),...f.actions.map(x=>x.id)]);
let a=0;const p=d;
function add(sec,obj){if(!ids.has(obj.id)){f[sec].push(obj);ids.add(obj.id);a++;}}
if(caps.includes('onoff')){
add('triggers',{id:p+'_turned_on',title:{en:'Turned on',fr:'Allumé',nl:'Aangezet',de:'Eingeschaltet'},args:[]});
add('triggers',{id:p+'_turned_off',title:{en:'Turned off',fr:'Éteint',nl:'Uitgezet',de:'Ausgeschaltet'},args:[]});
add('conditions',{id:p+'_is_on',title:{en:'Is !{{on|off}}',fr:'Est !{{allumé|éteint}}',nl:'Is !{{aan|uit}}',de:'Ist !{{ein|aus}}'},args:[]});
add('actions',{id:p+'_turn_on',title:{en:'Turn on',fr:'Allumer',nl:'Aanzetten',de:'Einschalten'},args:[]});
add('actions',{id:p+'_turn_off',title:{en:'Turn off',fr:'Éteindre',nl:'Uitzetten',de:'Ausschalten'},args:[]});
add('actions',{id:p+'_toggle',title:{en:'Toggle',fr:'Basculer',nl:'Wisselen',de:'Umschalten'},args:[]});
}
if(a>0){fs.writeFileSync(fp,JSON.stringify(f,null,2)+'\n');total+=a;mod++;console.log(d+': +'+a);}
}
console.log('Done: '+total+' cards added to '+mod+' drivers');
