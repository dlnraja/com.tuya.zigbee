#!/usr/bin/env node
'use strict';
// Retry wrapper for transient failures (API rate limits, network timeouts)
// Usage: node retry-runner.js <script.js> [--retries 3] [--delay 5000]
const{execSync}=require('child_process');
const args=process.argv.slice(2);
let script=null,retries=3,delay=5000;
for(let i=0;i<args.length;i++){
  if(args[i]==='--retries'&&args[i+1]){retries=parseInt(args[++i])||3}
  else if(args[i]==='--delay'&&args[i+1]){delay=parseInt(args[++i])||5000}
  else if(!script)script=args[i];
}
if(!script){console.error('Usage: retry-runner.js <script> [--retries N] [--delay ms]');process.exit(1)}
if(!/^[a-zA-Z0-9._\-\/\\]+$/.test(script)){console.error('[retry-runner] Invalid script path');process.exit(1)}
const env=Object.assign({},process.env);
for(let attempt=1;attempt<=retries;attempt++){
  try{
    console.log(`[retry-runner] Attempt ${attempt}/${retries}: ${script}`);
    execSync(`node ${script}`,{stdio:'inherit',env,timeout:10*60*1000});
    console.log(`[retry-runner] Success on attempt ${attempt}`);
    process.exit(0);
  }catch(err){
    const code=err.status||1;
    console.error(`[retry-runner] Attempt ${attempt} failed (exit ${code})`);
    if(attempt<retries){
      const wait=delay*Math.pow(1.5,attempt-1);
      console.log(`[retry-runner] Waiting ${Math.round(wait/1000)}s before retry...`);
      const end=Date.now()+wait;while(Date.now()<end){}
    }
  }
}
console.error(`[retry-runner] All ${retries} attempts failed for ${script}`);
process.exit(1);
