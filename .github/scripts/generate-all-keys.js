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
  try{execSync(`gh secret set ${n} -R ${REPO} --body "${v}"`,{stdio:'pipe'});return true}catch{return false}
}

async function discourseKey(browser){
  const PORT=9876;
  const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'pkcs1',format:'pem'},privateKeyEncoding:{type:'pkcs1',format:'pem'}});
  const cid=crypto.randomBytes(16).toString('hex');
  const redir='http://localhost:'+PORT+'/cb';
  const url='https://community.homey.app/user-api-key/new?application_name=Universal+Tuya+Zigbee+Bot&client_id='+cid+'&scopes=write,read&public_key='+encodeURIComponent(pair.publicKey)+'&nonce='+cid+'&auth_redirect='+encodeURIComponent(redir);
  return new Promise(resolve=>{
    const srv=http.createServer((req,res)=>{
      if(!req.url.includes('/cb')){res.end('wait');return}
      const p=new URL(req.url,'http://localhost:'+PORT).searchParams.get('payload');
      if(!p){res.end('no payload');return}
      try{
        const dec=crypto.privateDecrypt({key:pair.privateKey,padding:crypto.constants.RSA_PKCS1_PADDING},Buffer.from(p,'base64'));
        const j=JSON.parse(dec.toString());
        res.end('<h1>Done</h1>');srv.close();resolve(j.key);
      }catch{res.end('err');srv.close();resolve(null)}
    });
    srv.listen(PORT,async()=>{
      console.log('  Callback server on :'+PORT);
      const pg=await browser.newPage();
      await pg.goto(url,{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
      console.log('  >> Login & click Authorize <<');
    });
    setTimeout(()=>{try{srv.close()}catch{}resolve(null)},180000);
  });
}

async function main(){
  console.log('\n=== API Key Generator ===\n');
  const ex=getSecrets();
  console.log('Existing:',ex.join(', '));
  const puppeteer=require('puppeteer');
  const browser=await puppeteer.launch({headless:false,defaultViewport:{width:1280,height:900}});
  const got={};
  if(!ex.includes('DISCOURSE_API_KEY')){
    console.log('\n--- Discourse API Key ---');
    const k=await discourseKey(browser);
    if(k){got.DISCOURSE_API_KEY=k;console.log('  Got: '+k.substring(0,8)+'...')}
  }
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
