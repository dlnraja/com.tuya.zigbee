#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{execSync,fork}=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const SECRETS=['DISCOURSE_API_KEY','HOMEY_EMAIL','HOMEY_PASSWORD','GOOGLE_API_KEY','GH_PAT','HOMEY_PAT'];

// 1. Load .env file
const envPath=path.join(ROOT,'.env');
let envLoaded=0;
if(fs.existsSync(envPath)){
  for(const line of fs.readFileSync(envPath,'utf8').split('\n')){
    const m=line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.+?)\s*$/);
    if(m&&m[2]&&!m[2].startsWith('#')&&!process.env[m[1]]){
      process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');envLoaded++;
    }
  }
}
console.log('.env: loaded '+envLoaded+' vars');

// 2. Try gh CLI for missing secrets
const missing=SECRETS.filter(k=>!process.env[k]);
if(missing.length){
  let ghOk=false;
  try{execSync('gh --version',{stdio:'ignore'});ghOk=true}catch{}
  if(ghOk){
    console.log('Fetching '+missing.length+' secrets via gh...');
    for(const k of missing){
      try{
        const v=execSync('gh secret list --json name 2>nul',{encoding:'utf8',cwd:ROOT,timeout:10000}).trim();
        if(v.includes(k))console.log('  '+k+': exists in repo (gh cannot read values, use .env)');
      }catch{}
    }
    console.log('Tip: gh cannot read secret values. Add them to .env:');
    for(const k of missing)console.log('  '+k+'=your_value_here');
  }
}

// 3. Show auth status
const hasApi=!!process.env.DISCOURSE_API_KEY;
const hasSso=!!(process.env.HOMEY_EMAIL&&process.env.HOMEY_PASSWORD);
console.log('Auth: API='+(hasApi?'yes':'no')+' SSO='+(hasSso?'yes':'no'));
if(!hasApi&&!hasSso){console.error('No forum auth. Set DISCOURSE_API_KEY or HOMEY_EMAIL+HOMEY_PASSWORD in .env');process.exit(1)}

// 4. Run target script
const target=process.argv[2];
if(!target){
  console.log('\nUsage: node .github/scripts/local-run.js <script-name>\n');
  console.log('Available scripts:');
  const scripts=fs.readdirSync(__dirname).filter(f=>f.endsWith('.js')&&f!=='local-run.js'&&!f.startsWith('_'));
  scripts.sort().forEach(s=>console.log('  '+s.replace('.js','')));
  process.exit(0);
}

let scriptPath=path.join(__dirname,target);
if(!scriptPath.endsWith('.js'))scriptPath+='.js';
if(!fs.existsSync(scriptPath)){console.error('Script not found: '+scriptPath);process.exit(1)}
console.log('\n=== Running: '+path.basename(scriptPath)+' ===\n');
require(scriptPath);
