#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {loadFingerprints,findDriver,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');

// Seed topics (READ-ONLY scanning  this script never posts, only gathers intel)
const SEED_TOPICS=[
  140352,  // dlnraja: [APP][Pro] Universal TUYA Zigbee Device App - test
  26439,   // JohanBendz: [APP][Pro] Tuya Zigbee App
  146735,  // [APP] Tuya - Smart Life. Smart Living
  89271,   // Zigbee device compatibility
  54018,   // Generic Zigbee devices
];

// High-value search terms (consolidated from 42 to 12 to avoid Discourse rate limits)
const SEARCH_TERMS=[
  'tuya zigbee homey','tuya wifi smart life homey',
  'universal tuya device','zigbee unknown device homey',
  '_TZE200 _TZE204','_TZ3000 TS0601',
  'zigbee interview fingerprint','zigbee pairing not working homey',
  'BSEED Zemismart Moes zigbee','eWeLink sonoff zigbee homey',
  'tuya device request','zigbee sensor thermostat cover',
];

const BASE='https://community.homey.app';
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');
const LAST_FILE=process.env.LAST_POST_FILE||'/tmp/last_forum_post.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const START_TIME=Date.now();
const MAX_RUNTIME_MS=20*60*1000; // 20 min max  exit gracefully before workflow timeout
function timeLeft(){return MAX_RUNTIME_MS-(Date.now()-START_TIME);}

async function get(url){
  const r=await fetchWithRetry(url,{headers:{Accept:'application/json'}},{retries:2,label:'forumGet'});
  if(!r.ok){const body=await r.text().catch(()=>'');throw new Error('HTTP '+r.status+': '+body.slice(0,80));}
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
      await sleep(1200); // Discourse rate limit (avoid 429)
    }catch(e){console.warn('Search "'+term+'" failed:',e.message);}
  }
  console.log('Discovered '+found.size+' unique topics ('+SEED_TOPICS.length+' seed + '+(found.size-SEED_TOPICS.length)+' from search)');
  if(found.size<=SEED_TOPICS.length)console.warn('Discovery added 0 new topics  using seed topics only');
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
    if(timeLeft()<60000){console.log('Time guard: '+topicsScanned+'/'+allTopics.length+' topics scanned, saving partial results');break;}
    try{
      const data=await get(BASE+'/t/'+TOPIC_ID+'/posts.json?post_number=999999');
      const stream=data.post_stream||{};
      const allPostIds=(stream.stream||[]);
      
      const newPostIds = allPostIds.filter(id => id > lastId);
      const posts=[];
      
      // Use the posts already provided in the initial fetch to avoid extra requests
      const initialPosts = stream.posts || [];
      for (const p of initialPosts) {
        if (p.id > lastId) posts.push(p);
      }
      
      const initialPostIds = new Set(initialPosts.map(p => p.id));
      const postIdsToFetch = newPostIds.filter(id => !initialPostIds.has(id)).slice(-100);

      // Only chunk requests if we have actually new unseen post IDs
      if (postIdsToFetch.length > 0) {
        for(let i=0;i<postIdsToFetch.length;i+=20){
          const chunk=postIdsToFetch.slice(i,i+20);
          const url=BASE+'/t/'+TOPIC_ID+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&');
          try{const r=await get(url);posts.push(...(r.post_stream?.posts||[]));}
          catch(e){/* skip chunk error */}
        }
      }

      const newPosts=posts.filter(p=>p.id>lastId);
      if(newPosts.length>0)console.log('Topic '+TOPIC_ID+': '+newPosts.length+' new posts');
      topicsScanned++;

      const IP=[
        {id:'pairing',rx:/not pairing|pair(ing)? fail|won'?t pair|can'?t add|interview fail/i},
        {id:'disconnect',rx:/disconnect|offline|unavailable|keeps dropping|not responding/i},
        {id:'wrong_values',rx:/wrong (value|temp|humidity|power)|incorrect|shows 0|inverted/i},
        {id:'wifi_request',rx:/wifi|wi-fi|smart\s*life|local\s*key|tuya\s*cloud|lidl|meross|avatto/i},
        {id:'battery',rx:/battery (drain|issue|wrong|0%)|false battery/i},
        {id:'unknown_device',rx:/unknown device|not recognized|unsupported|generic zigbee/i},
      ];
      for(const p of newPosts){
        const text=(p.cooked||'').replace(/<[^>]+>/g,' ');
        const mfrs=extractMfrFromText(text);
        const found=mfrs.filter(m=>fps.has(m));
        const missing=mfrs.filter(m=>!fps.has(m));
        const issues=IP.filter(pat=>pat.rx.test(text)).map(pat=>pat.id);
        if(missing.length||issues.length){
          allIssues.push({user:p.username||'unknown',date:p.created_at?.slice(0,10)||'',
            topicId:TOPIC_ID,postNum:p.post_number,postId:p.id,
            missing,found,issues,text:text.slice(0,300)});
        }
      }
      if(posts.length){const mx=Math.max(...posts.map(p=>p.id));if(mx>lastId)lastId=mx;}
      if(topicsScanned%10===0)await sleep(300); // rate limit
    }catch(e){console.warn('Topic '+TOPIC_ID+' error:',e.message);}
  }

  // Aggregate issue categories
  const cats={};
  for(const i of allIssues)for(const c of(i.issues||[]))cats[c]=(cats[c]||0)+1;

  let report='## Forum Scanner (intel mode)\n';
  report+='| Metric | Value |\n|--------|-------|\n';
  report+='| Seed topics | '+SEED_TOPICS.length+' |\n';
  report+='| Discovered topics | '+allTopics.length+' |\n';
  report+='| Topics scanned | '+topicsScanned+' |\n';
  report+='| Posts with intel | '+allIssues.length+' |\n';
  for(const[c,n]of Object.entries(cats).sort((a,b)=>b[1]-a[1]))report+='| '+c+' | '+n+' |\n';
  report+='\n';

  if(allIssues.filter(i=>i.missing.length).length){
    report+='### Unsupported devices\n';
    report+='| User | Date | Post | Missing FPs | Issues |\n';
    report+='|------|------|------|-------------|--------|\n';
    for(const i of allIssues.filter(i=>i.missing.length).slice(0,50)){
      report+='| '+i.user+' | '+i.date+' | [T'+i.topicId+'#'+i.postNum+']('+BASE+'/t/'+i.topicId+'/'+i.postNum+') | '+i.missing.join(',')+' | '+(i.issues||[]).join(',')+' |\n';
    }
  }

  // Structured intel output (scan-only, never posts)
  const intel={
    timestamp:new Date().toISOString(),
    topicsScanned,totalPosts:allIssues.length,
    categories:cats,
    missingFPs:[...new Set(allIssues.flatMap(i=>i.missing))],
    wifiRequests:allIssues.filter(i=>(i.issues||[]).includes('wifi_request')).slice(0,30),
    pairingIssues:allIssues.filter(i=>(i.issues||[]).includes('pairing')).slice(0,30),
    unknownDevices:allIssues.filter(i=>(i.issues||[]).includes('unknown_device')).slice(0,30),
    wrongValues:allIssues.filter(i=>(i.issues||[]).includes('wrong_values')).slice(0,20),
    allIssues:allIssues.slice(0,200),
  };
  const SD=process.env.STATE_DIR||path.join(__dirname,'..','state');
  fs.mkdirSync(SD,{recursive:true});
  fs.writeFileSync(path.join(SD,'forum-intel.json'),JSON.stringify(intel,null,2));
  console.log('Forum intel: '+intel.missingFPs.length+' missing FPs, '+Object.keys(cats).length+' issue categories');

  if(lastId>0)fs.writeFileSync(LAST_FILE,String(lastId));
  console.log(report);
  fs.appendFileSync(SUMMARY,report+'\n');
}

scan().catch(e=>{console.error('Forum scan failed:',e);process.exit(1);});
