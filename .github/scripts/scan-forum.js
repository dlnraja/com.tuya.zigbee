#!/usr/bin/env node
'use strict';
const fs=require('fs');
const {loadFingerprints,findDriver,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');

// Seed topics (always scanned)
const SEED_TOPICS=[
  140352,  // dlnraja: [APP][Pro] Universal TUYA Zigbee Device App - test
  26439,   // JohanBendz: [APP][Pro] Tuya Zigbee App
  146735,  // [APP] Tuya - Smart Life. Smart Living
  89271,   // [APP][Pro] Tuya Zigbee App - Device Request Archive
  54018,   // Tuya WiFi devices
  12758,   // Zigbee devices general
  85498,   // Zigbee2MQTT vs native
];

// Search terms to discover ALL related topics across the entire forum
const SEARCH_TERMS=[
  'tuya zigbee','tuya wifi','tuya smart life',
  'zigbee device','zigbee pairing','zigbee interview',
  'tuya device request','tuya fingerprint',
  '_TZE200','_TZE204','_TZ3000','TS0601',
  'universal tuya','tuya app homey',
  'zigbee switch tuya','zigbee sensor tuya',
  'tuya thermostat','tuya dimmer','tuya cover',
];

const BASE='https://community.homey.app';
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');
const LAST_FILE=process.env.LAST_POST_FILE||'/tmp/last_forum_post.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function get(url){
  const r=await fetchWithRetry(url,{headers:{Accept:'application/json'}},{retries:2,label:'forumGet'});
  if(!r.ok)throw new Error('HTTP '+r.status+': '+url);
  return r.json();
}

// Discover topics via Discourse search API
async function discoverTopics(){
  const found=new Set(SEED_TOPICS);
  console.log('Discovering topics via search API...');
  for(const term of SEARCH_TERMS){
    try{
      const url=BASE+'/search.json?q='+encodeURIComponent(term)+'&page=1';
      const r=await get(url);
      for(const t of(r.topics||[]))found.add(t.id);
      for(const p of(r.posts||[]))if(p.topic_id)found.add(p.topic_id);
      await sleep(500); // rate limit
    }catch(e){console.warn('Search "'+term+'" failed:',e.message);}
  }
  console.log('Discovered '+found.size+' unique topics ('+SEED_TOPICS.length+' seed + '+(found.size-SEED_TOPICS.length)+' from search)');
  return[...found];
}

async function scan(){
  const fps=loadFingerprints();
  console.log('Loaded '+fps.size+' fingerprints');

  let lastId=0;
  if(fs.existsSync(LAST_FILE)){
    lastId=parseInt(fs.readFileSync(LAST_FILE,'utf8').trim())||0;
  }

  const allTopics=await discoverTopics();
  const allIssues=[];
  let topicsScanned=0;

  for(const TOPIC_ID of allTopics){
    try{
      const data=await get(BASE+'/t/'+TOPIC_ID+'/posts.json?post_number=999999');
      const stream=data.post_stream||{};
      const postIds=(stream.stream||[]).slice(-100);

      const posts=[];
      for(let i=0;i<postIds.length;i+=20){
        const chunk=postIds.slice(i,i+20);
        const url=BASE+'/t/'+TOPIC_ID+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&');
        try{const r=await get(url);posts.push(...(r.post_stream?.posts||[]));}
        catch(e){/* skip chunk error */}
      }

      const newPosts=posts.filter(p=>p.id>lastId);
      if(newPosts.length>0)console.log('Topic '+TOPIC_ID+': '+newPosts.length+' new posts');
      topicsScanned++;

      for(const p of newPosts){
        const text=(p.cooked||'').replace(/<[^>]+>/g,' ');
        const mfrs=extractMfrFromText(text);
        if(!mfrs.length)continue;
        const found=mfrs.filter(m=>fps.has(m));
        const missing=mfrs.filter(m=>!fps.has(m));
        if(missing.length){
          allIssues.push({user:p.username||'unknown',date:p.created_at?.slice(0,10)||'',
            topicId:TOPIC_ID,postNum:p.post_number,missing,found,text:text.slice(0,200)});
        }
      }
      if(posts.length){const mx=Math.max(...posts.map(p=>p.id));if(mx>lastId)lastId=mx;}
      if(topicsScanned%10===0)await sleep(300); // rate limit
    }catch(e){/* skip topic errors silently */}
  }

  let report='## Forum Scanner\n';
  report+='| Metric | Value |\n|--------|-------|\n';
  report+='| Seed topics | '+SEED_TOPICS.length+' |\n';
  report+='| Discovered topics | '+allTopics.length+' |\n';
  report+='| Topics scanned | '+topicsScanned+' |\n';
  report+='| Device requests found | '+allIssues.length+' |\n\n';

  if(allIssues.length){
    report+='### Posts with unsupported devices\n';
    report+='| User | Date | Post# | Missing FPs | Already Supported |\n';
    report+='|------|------|-------|-------------|-------------------|\n';
    for(const i of allIssues.slice(0,50)){
      report+='| '+i.user+' | '+i.date+' | [#'+i.postNum+']('+BASE+'/t/'+i.topicId+'/'+i.postNum+') | '+i.missing.join(',')+' | '+i.found.length+' |\n';
    }
    if(allIssues.length>50)report+='\n_...and '+(allIssues.length-50)+' more_\n';
  }

  if(lastId>0)fs.writeFileSync(LAST_FILE,String(lastId));
  console.log(report);
  fs.appendFileSync(SUMMARY,report+'\n');
  if(allIssues.length)fs.writeFileSync('/tmp/forum_issues.json',JSON.stringify(allIssues,null,2));
}

scan().catch(e=>{console.error('Forum scan failed:',e);process.exit(1);});
