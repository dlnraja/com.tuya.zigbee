#!/usr/bin/env node
'use strict';
const{execSync}=require('child_process');
const DRY=process.argv.includes('--dry-run');
const REPO='JohanBendz/com.tuya.zigbee';
const OWNERS=new Set(['dlnraja','github-actions[bot]','dependabot[bot]','tuya-triage-bot']);
const KEYS=['closing','already supported','install test','all fp','already in v'];
function gh(c){try{return execSync('gh '+c,{encoding:'utf8',maxBuffer:10*1024*1024}).trim()}catch{return null}}
async function main(){
  console.log('=== Batch Close Upstream ('+(DRY?'DRY':'LIVE')+') ===');
  let items=[],closed=0,skipped=0;
  for(let p=1;p<=10;p++){
    const r=gh('api "repos/'+REPO+'/issues?state=open&sort=updated&per_page=100&page='+p+'" --jq "[.[]|{n:.number,t:.title[0:60],pr:(.pull_request!=null)}]"');
    if(!r)break;const b=JSON.parse(r);if(!b.length)break;items.push(...b);if(b.length<100)break;
  }
  console.log('Found '+items.length+' open items\n');
  for(const it of items){
    const cr=gh('api "repos/'+REPO+'/issues/'+it.n+'/comments?per_page=1&sort=created&direction=desc" --jq ".[0]|{u:.user.login,b:.body[0:200]}"');
    if(!cr){skipped++;continue}
    const c=JSON.parse(cr);const u=c.u||'';const b=(c.b||'').toLowerCase();
    const isOwner=OWNERS.has(u);
    const hasKey=KEYS.some(k=>b.includes(k));
    if(isOwner&&hasKey){
      const ep=it.pr?'pulls':'issues';
      if(DRY){console.log('[DRY] Would close #'+it.n+' ('+u+'): '+it.t);closed++}
      else{
        const ok=gh('api -X PATCH "repos/'+REPO+'/'+ep+'/'+it.n+'" -f state=closed 2>&1');
        if(ok&&!ok.includes('403')){console.log('CLOSED #'+it.n+' ('+u+'): '+it.t);closed++}
        else{console.log('FAILED #'+it.n+' (403): '+it.t);skipped++}
      }
    }else{skipped++;console.log('SKIP #'+it.n+' (last: '+u+'): '+it.t)}
    await new Promise(r=>setTimeout(r,500));
  }
  console.log('\n=== Done: '+closed+' closed, '+skipped+' skipped ===');
}
main().catch(e=>{console.error(e);process.exit(1)});
