#!/usr/bin/env node
'use strict';
const https=require('https');
const fs=require('fs');
const {loadFingerprints,findDriver,extractMfrFromText}=require('./load-fingerprints');

const TOPICS=[140352, 26439];
const BASE='https://community.homey.app';
const os=require('os');
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');
const LAST_FILE=process.env.LAST_POST_FILE||'/tmp/last_forum_post.txt';

function fetch(url){
  return new Promise((res,rej)=>{
    https.get(url,{headers:{'Accept':'application/json'}},r=>{
      let d='';r.on('data',c=>d+=c);r.on('end',()=>{
        try{res(JSON.parse(d));}catch{rej(new Error('Parse fail'));}
      });
    }).on('error',rej);
  });
}

async function scan(){
  const fps=loadFingerprints();
  console.log(`Loaded ${fps.size} fingerprints`);
  
  // Get last N posts from the topic
  let lastId=0;
  if(fs.existsSync(LAST_FILE)){
    lastId=parseInt(fs.readFileSync(LAST_FILE,'utf8').trim())||0;
  }
  
  const allIssues=[];
  for(const TOPIC_ID of TOPICS){
  console.log(`Scanning topic ${TOPIC_ID}...`);
  const data=await fetch(`${BASE}/t/${TOPIC_ID}/posts.json?post_number=999999`);
  const stream=data.post_stream||{};
  const postIds=(stream.stream||[]).slice(-50);
  
  const posts=[];
  // Fetch in chunks of 20
  for(let i=0;i<postIds.length;i+=20){
    const chunk=postIds.slice(i,i+20);
    const url=`${BASE}/t/${TOPIC_ID}/posts.json?${chunk.map(id=>`post_ids[]=${id}`).join('&')}`;
    try{
      const r=await fetch(url);
      posts.push(...(r.post_stream?.posts||[]));
    }catch(e){console.error('Fetch error:',e.message);}
  }
  
  const newPosts=posts.filter(p=>p.id>lastId);
  console.log(`Topic ${TOPIC_ID}: ${newPosts.length} new posts`);
  
  const issues=[];
  for(const p of newPosts){
    const text=(p.cooked||'').replace(/<[^>]+>/g,' ');
    const mfrs=extractMfrFromText(text);
    if(!mfrs.length)continue;
    
    const found=mfrs.filter(m=>fps.has(m));
    const missing=mfrs.filter(m=>!fps.has(m));
    const user=p.username||'unknown';
    const date=p.created_at?.slice(0,10)||'';
    
    if(missing.length){
      issues.push({user,date,topicId:TOPIC_ID,postNum:p.post_number,missing,found,text:text.slice(0,200)});
    }
  }
  allIssues.push(...issues);
  if(posts.length){ const mx=Math.max(...posts.map(p=>p.id)); if(mx>lastId) lastId=mx; }
  } // end for TOPICS
  
  let report=`## Forum Scanner\n`;
  report+=`| Topics scanned | ${TOPICS.length} |\n|--------|-------|\n\n`;
  if(allIssues.length){
    report+=`### Posts with unsupported devices\n`;
    report+=`| User | Date | Post# | Missing FPs | Already Supported |\n`;
    report+=`|------|------|-------|-------------|-------------------|\n`;
    for(const i of allIssues){
      report+=`| ${i.user} | ${i.date} | [#${i.postNum}](${BASE}/t/${i.topicId}/${i.postNum}) | \`${i.missing.join('`,`')}\` | ${i.found.length} |\n`;
    }
  }
  
  // Save last post ID (max across all topics)
  if(lastId>0) fs.writeFileSync(LAST_FILE,String(lastId));
  
  console.log(report);
  fs.appendFileSync(SUMMARY,report+'\n');
  
  // Save issues as JSON for potential auto-response
  if(allIssues.length){
    fs.writeFileSync('/tmp/forum_issues.json',JSON.stringify(allIssues,null,2));
  }
}

scan().catch(e=>{console.error('Forum scan failed:',e);process.exit(1);});
