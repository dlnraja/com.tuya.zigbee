#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {loadFingerprints,findDriver,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');

// Seed topics (READ-ONLY scanning — this script never posts, only gathers intel)
const SEED_TOPICS=[
  140352,  // dlnraja: [APP][Pro] Universal TUYA Zigbee Device App - test
  26439,   // JohanBendz: [APP][Pro] Tuya Zigbee App
  146735,  // [APP] Tuya - Smart Life. Smart Living
  89271,   // Zigbee device compatibility
  54018,   // Generic Zigbee devices
];

// Search terms to discover ALL related topics across the entire forum
// Covers: Tuya Zigbee, Tuya WiFi, Tuya Smart Life, generic Zigbee, device types
const SEARCH_TERMS=[
  // Core Tuya terms
  'tuya zigbee','tuya wifi','tuya smart life','tuya cloud',
  'tuya device request','tuya fingerprint','tuya app homey',
  'universal tuya','tuya unknown device','tuya not pairing',
  // Tuya WiFi specific
  'tuya wifi switch','tuya wifi plug','tuya wifi thermostat',
  'smart life wifi','smart life app homey','tuya local control',
  // Zigbee generic
  'zigbee device','zigbee pairing','zigbee interview','zigbee unknown',
  'zigbee switch','zigbee sensor','zigbee thermostat','zigbee dimmer',
  'zigbee cover','zigbee blind','zigbee curtain','zigbee valve',
  'zigbee button','zigbee remote','zigbee plug','zigbee light',
  'zigbee lock','zigbee siren','zigbee garage','zigbee fan',
  // Manufacturer fingerprints
  '_TZE200','_TZE204','_TZE284','_TZ3000','_TZ3210','_TZ3002',
  'TS0601','TS0001','TS0002','TS0003','TS0004','TS011F','TS0044',
  'TS0215A','TS0043','TS0601 interview',
  // Brands & models
  'BSEED zigbee','Zemismart','Moes zigbee','AVATTO','Lonsonho',
  'HOBEIAN','Lidl zigbee','Silvercrest zigbee','eWeLink zigbee',
  // Problem patterns
  'unknown zigbee device homey','device not recognized','manufacturerName',
  'zigbee re-pair','zigbee mesh problem','zigbee interview homey',
  'homey pro zigbee','zigbee2mqtt homey',
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
    }catch(e){/* skip topic errors silently */}
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
