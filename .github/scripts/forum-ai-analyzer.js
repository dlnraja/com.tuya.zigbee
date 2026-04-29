#!/usr/bin/env node
'use strict';
/**
 * Forum AI Analyzer - v7.4.15
 * Scraper TOUS les messages du forum Homey et les analyse via Minimax AI
 * Source: Minimax (abonnement ~20€/mois - PRIMAIR)
 * 
 */
const fs=require('fs'),path=require('path');
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{callAI}=require('./ai-helper');
const{fetchWithRetry}=require('./retry-helper');

const DRY_RUN=process.argv.includes('--dry-run');
const STATE_F=path.join(__dirname,'..','state','forum-ai-analysis-state.json');
const REPORT_F=path.join(__dirname,'..','state','forum-ai-analysis-report.json');
const ANALYSIS_F=path.join(__dirname,'..','state','forum-device-analysis.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Strip HTML tags
const strip=h=>(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'')
  .replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>')
  .replace(/"/g,'"').replace(/&#39;/g,"'").replace(/\n{3,}/g,'\n\n').trim();

// Extract fingerprints from text
function extractFP(txt){
  const fp=[],re=/[_T][A-Z0-9]{4,6}_[A-Za-z0-9]{4,16}/g;
  let m;while((m=re.exec(txt))!==null)fp.push(m[0]);
  return[...new Set(fp)];
}

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_F,'utf8'))}catch{return{lastRun:null,processedTopics:{},lastPostNumbers:{}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_F),{recursive:true});fs.writeFileSync(STATE_F,JSON.stringify(s,null,2)+'\n')}

async function forumGet(ep,auth,opts={}){
  const h={'Accept':'application/json','User-Agent':'tuya-forum-bot'};
  if(auth?.type==='apikey'){h['User-Api-Key']=auth.key}
  else if(auth?.type==='session'){h['Cookie']=fmtCk(auth.cookies);h['X-CSRF-Token']=auth.csrf;h['X-Requested-With']='XMLHttpRequest'}
  try{const r=await fetchWithRetry(FORUM+ep,{headers:h},{retries:opts.retries||2,label:'forum',timeout:opts.timeout||15000});if(!r.ok){return null}return r.json()}catch(e){return null}
}

// Topics à scanner (Thread principal + topics liés)
const TOPICS_TO_SCAN=[
  {id:140352,name:'Universal Tuya Zigbee main thread'},  // Thread principal
  // Ajouter d'autres topics si nécessaire
];

async function scanTopic(topicId,auth,maxPosts=100){
  console.log(`  Scanning topic #${topicId}...`);
  const d=await forumGet('/t/'+topicId+'.json',auth);
  if(!d)return null;
  
  const state=loadState();
  const lastNum=state.lastPostNumbers[topicId]||0;
  const posts=d.post_stream?.posts||[];
  
  const newPosts=posts.filter(p=>p.post_number>lastNum);
  if(newPosts.length===0){console.log('    No new posts');return null}
  
  // Extract data from new posts
  const extracted=newPosts.map(p=>({
    postNum:p.post_number,
    user:p.username,
    text:strip(p.cooked),
    date:p.created_at,
    fingerprints:extractFP(p.cooked||'')
  }));
  
  state.lastPostNumbers[topicId]=Math.max(...newPosts.map(p=>p.post_number));
  saveState(state);
  
  return{topicId,topicTitle:d.title,posts:extracted,total:newPosts.length};
}

async function analyzeWithAI(topicData){
  console.log(`  Analyzing ${topicData.posts.length} posts via Minimax...`);
  

For each post containing a device request or fingerprint, extract:
1. User request details
2. Device fingerprints (manufacturerName patterns like _TZ3000_, _TZE200_, etc.)
3. Device type (switch, sensor, TRV, cover, dimmer, etc.)
4. Problem description
5. Suggested action

Posts to analyze:
${JSON.stringify(topicData.posts.map(p=>({user:p.user,text:p.text.substring(0,500),fps:p.fingerprints})),null,2)}

Output as JSON array:
[{"user":"...", "request":"...", "fingerprints":["..."], "deviceType":"...", "action":"..."}]
`;

  // USE MINIMAX PRIMARILY
  const result=await callAI(prompt,
    {maxTokens:4096,complexity:'high'}
  );
  
  if(result&&result.text&&result.text!=='AI_OFFLINE_OR_LIMIT_REACHED'){
    try{
      const cleaned=result.text.replace(/```json/g,'').replace(/```/g,'').trim();
      return JSON.parse(cleaned);
    }catch(e){console.log('  JSON parse error:',e.message)}
  }
  return[];
}

async function generateSummary(allAnalysis){
  console.log('  Generating AI summary...');
  
  const prompt=`Generate a summary report for the Universal Tuya Zigbee app based on this analysis:

${JSON.stringify(allAnalysis,null,2)}

Format:
## Forum Analysis Summary

### New Device Requests
(list each with user + fingerprint + suggested driver)

### Issues Reported
(list common problems)

### Fingerprints Found
(list all _TZ* patterns)

### Priority Actions
(numbered list)

Keep it concise, max 300 words.`;
  
  return await callAI(prompt,'You are Dylan. Generate a concise summary.',{maxTokens:1024,complexity:'medium'});
}

async function main(){
  console.log('\n=== Forum AI Analyzer v7.4.15 (Minimax Primary) ===');
  console.log('Mode:',DRY_RUN?'DRY RUN':'LIVE');
  
  // Get Minimax budget status
  const {getAIBudget}=require('./ai-helper');
  const budget=getAIBudget();
  const minUsed=budget.used?.minimax||0;
  console.log('Minimax usage:',minUsed,'tokens\n');
  
  const state=loadState();
  state.lastRun=new Date().toISOString();
  
  const auth=await getForumAuth();
  if(!auth)console.log('WARNING: No forum auth - public data only');
  
  const allResults=[];
  const allAnalysis=[];
  
  for(const topic of TOPICS_TO_SCAN){
    console.log(`\nProcessing: ${topic.name}`);
    
    const data=await scanTopic(topic.id,auth);
    if(!data){console.log('  No new posts');continue}
    
    console.log(`  Found ${data.posts.length} new posts`);
    
    // Analyze with AI (Minimax)
    const analysis=await analyzeWithAI(data);
    if(analysis.length){
      console.log(`  AI extracted ${analysis.length} device requests`);
      allAnalysis.push(...analysis);
    }
    
    // Store results
    allResults.push({topicId:topic.id,name:topic.name,posts:data.posts.length,analysis});
    
    await sleep(2000); // Rate limit
  }
  
  // Generate summary
  console.log('\nGenerating summary...');
  const summary=await generateSummary(allAnalysis);
  
  // Save reports
  const report={
    timestamp:new Date().toISOString(),
    mode:DRY_RUN?'dry-run':'live',
    topicsScanned:allResults.length,
    totalNewPosts:allResults.reduce((s,r)=>s+r.posts,0),
    deviceRequests:allAnalysis.length,
    minimaxUsage:minUsed,
    summary:summary?.text||'No summary',
    analysis:allAnalysis
  };
  
  fs.mkdirSync(path.dirname(REPORT_F),{recursive:true});
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2));
  
  fs.writeFileSync(ANALYSIS_F,JSON.stringify(allAnalysis,null,2));
  
  console.log('\n=== DONE ===');
  console.log('Total posts scanned:',report.totalNewPosts);
  console.log('Device requests found:',report.deviceRequests);
  console.log('Minimax tokens used:',report.minimaxUsage);
  console.log('\nReports saved to:');
  console.log(' -',REPORT_F);
  console.log(' -',ANALYSIS_F);
  
  if(summary?.text)console.log('\n--- AI Summary ---\n',summary.text);
}

main().catch(e=>{console.error('Error:',e.message);process.exit(1)});