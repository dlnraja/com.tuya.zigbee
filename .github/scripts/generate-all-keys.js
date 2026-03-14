#!/usr/bin/env node
'use strict';
const crypto=require('crypto'),http=require('http'),{execSync}=require('child_process');
const readline=require('readline');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=q=>new Promise(r=>rl.question(q,a=>r(a.trim())));
const REPO='dlnraja/com.tuya.zigbee';

const PROVS=[
  {name:'GROQ_API_KEY',url:'https://console.groq.com/keys'},
  {name:'HF_TOKEN',url:'https://huggingface.co/settings/tokens'},
  {name:'MISTRAL_API_KEY',url:'https://console.mistral.ai/api-keys'},
  {name:'CEREBRAS_API_KEY',url:'https://cloud.cerebras.ai/'},
  {name:'TOGETHER_API_KEY',url:'https://api.together.ai/settings/api-keys'},
];

function getSecrets(){
  try{return execSync(`gh secret list -R ${REPO}`,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).split('\n').map(l=>l.split(/\s/)[0]).filter(Boolean)}catch{return[]}
}
function setSec(n,v){
  try{execSync(`gh secret set ${n} -R ${REPO}`,{stdio:'pipe',input:v,encoding:'utf8'});return true}catch{return false}
}

// discourseKey removed (Discourse disabled)

async function main(){
  console.log('\n=== API Key Generator ===\n');
  const ex=getSecrets();
  console.log('Existing:',ex.join(', '));
  const puppeteer=require('puppeteer');
  const browser=await puppeteer.launch({headless:false,defaultViewport:{width:1280,height:900}});
  const got={};
  // DISCOURSE_API_KEY removed
  for(const p of PROVS){
    if(ex.includes(p.name)){console.log(`\n--- ${p.name} --- exists`);continue}
    console.log(`\n--- ${p.name} ---`);
    const pg=await browser.newPage();
    await pg.goto(p.url,{waitUntil:'networkidle2',timeout:30000}).catch(()=>{});
    console.log('  Opened: '+p.url+'\n  Sign up with GitHub, create key.');
    const k=await ask('  Paste key (Enter=skip): ');
    if(k)got[p.name]=k;
    await pg.close().catch(()=>{});
  }
  await browser.close().catch(()=>{});
  const entries=Object.entries(got).filter(([,v])=>v);
  if(entries.length){
    console.log('\nSetting '+entries.length+' secrets...');
    for(const[n,v]of entries){
      console.log(setSec(n,v)?'  + '+n+' set':'  x '+n+' failed');
    }
  }
  console.log('\nDone!');rl.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
