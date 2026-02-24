#!/usr/bin/env node
'use strict';
/**
 * Forum Activity Scraper - Scrapes ALL forum account activity for dlnraja
 * - User topics, posts, bookmarks, notifications
 * - Private messages (sent/received)
 * - References/mentions/citations of our project
 * - Associated threads in full content
 * - Extracts fingerprints, device info from everything
 */
const fs=require('fs'),path=require('path');
const{getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{callAI}=require('./ai-helper');
const{loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');

const USERNAME=process.env.FORUM_USERNAME||'dlnraja';
const STATE_F=path.join(__dirname,'..','state','forum-activity-state.json');
const REPORT_F=path.join(__dirname,'..','state','forum-activity-report.json');
const DATA_F=path.join(__dirname,'..','state','forum-activity-data.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=h=>(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const extractFP=t=>[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
const fps=loadFingerprints();

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_F,'utf8'))}catch{return{lastRun:null,processedTopics:[],processedPMs:[],processedNotifs:0}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_F),{recursive:true});fs.writeFileSync(STATE_F,JSON.stringify(s,null,2)+'\n')}

async function forumGet(ep,auth){
  const h={'Accept':'application/json','User-Agent':'tuya-forum-bot'};
  if(auth?.type==='apikey'){h['User-Api-Key']=auth.key}
  else if(auth?.type==='session'){h['Cookie']=fmtCk(auth.cookies);h['X-CSRF-Token']=auth.csrf;h['X-Requested-With']='XMLHttpRequest'}
  try{const r=await fetchWithRetry(FORUM+ep,{headers:h},{retries:3,label:'forumGet'});if(!r.ok){console.log('  GET',ep,r.status);return null}return r.json()}catch(e){console.log('  GET',ep,'error:',e.message);return null}
}

// 1. Get user profile summary
async function getUserSummary(auth){
  console.log('== User Summary ==');
  const u=await forumGet('/u/'+USERNAME+'/summary.json',auth);
  if(!u)return null;
  const s=u.user_summary||{};
  console.log('  Posts:',s.post_count,'Topics:',s.topic_count,'Likes:',s.likes_given,'Received:',s.likes_received);
  return{postCount:s.post_count,topicCount:s.topic_count,likes:s.likes_given,likesReceived:s.likes_received,
    topTopics:(u.topics||[]).map(t=>({id:t.id,title:t.title,posts:t.posts_count})),
    topReplies:(u.user_summary?.replies||[]).map(r=>({topicId:r.topic_id,postNum:r.post_number}))};
}

// 2. Get ALL user topics
async function getUserTopics(auth){
  console.log('== User Topics ==');
  const topics=[];let page=0;
  while(page<10){
    const d=await forumGet('/topics/created-by/'+USERNAME+'.json?page='+page,auth);
    if(!d||!d.topic_list?.topics?.length)break;
    for(const t of d.topic_list.topics)topics.push({id:t.id,title:t.title,posts:t.posts_count,views:t.views,lastPosted:t.last_posted_at,slug:t.slug});
    console.log('  Page',page,': +',d.topic_list.topics.length,'topics');
    if(d.topic_list.topics.length<30)break;
    page++;await sleep(500);
  }
  console.log('  Total:',topics.length,'topics');
  return topics;
}

// 3. Get user's posts/activity stream
async function getUserActivity(auth){
  console.log('== User Activity ==');
  const acts=[];let offset=0;
  while(offset<300){
    const d=await forumGet('/user_actions.json?username='+USERNAME+'&offset='+offset+'&limit=50',auth);
    if(!d||!d.user_actions?.length)break;
    for(const a of d.user_actions)acts.push({type:a.action_type,topicId:a.topic_id,postNum:a.post_number,title:a.title,excerpt:strip(a.excerpt),createdAt:a.created_at,username:a.acting_username});
    console.log('  Offset',offset,': +',d.user_actions.length,'actions');
    if(d.user_actions.length<50)break;
    offset+=50;await sleep(500);
  }
  console.log('  Total:',acts.length,'actions');
  return acts;
}

// 4. Get private messages
async function getPrivateMessages(auth){
  console.log('== Private Messages ==');
  if(!auth||auth.type!=='apikey'){console.log('  Skipping PMs (need API key)');return[]}
  const msgs=[];
  for(const box of['inbox','sent']){
    const d=await forumGet('/topics/private-messages/'+USERNAME+'.json?filter='+box,auth);
    if(!d||!d.topic_list?.topics)continue;
    for(const t of d.topic_list.topics)msgs.push({id:t.id,title:t.title,posts:t.posts_count,lastPosted:t.last_posted_at,box,participants:(t.posters||[]).map(p=>p.extras)});
    console.log(' ',box+':',d.topic_list?.topics?.length||0);
    await sleep(500);
  }
  console.log('  Total PMs:',msgs.length);
  return msgs;
}

// 5. Get notifications (mentions, quotes, replies)
async function getNotifications(auth){
  console.log('== Notifications ==');
  if(!auth){console.log('  Skipping (no auth)');return[]}
  const d=await forumGet('/notifications.json?limit=60&recent=true',auth);
  if(!d||!d.notifications)return[];
  const notifs=d.notifications.map(n=>({type:n.notification_type,topicId:n.topic_id,postNum:n.post_number,data:n.data,read:n.read,createdAt:n.created_at}));
  console.log('  Total:',notifs.length,'notifications');
  return notifs;
}

// 6. Get bookmarks
async function getBookmarks(auth){
  console.log('== Bookmarks ==');
  const d=await forumGet('/u/'+USERNAME+'/bookmarks.json',auth);
  if(!d||!d.bookmarks)return[];
  const bm=d.bookmarks.map(b=>({id:b.id,topicId:b.topic_id,postNum:b.post_number,title:b.title,excerpt:strip(b.excerpt),createdAt:b.created_at}));
  console.log('  Total:',bm.length,'bookmarks');
  return bm;
}

// 7. Search for project references/citations
async function searchProjectReferences(auth){
  console.log('== Project References ==');
  const terms=['dlnraja','universal tuya zigbee','com.dlnraja.tuya.zigbee','tuya zigbee device app test'];
  const refs=[];const seenTopics=new Set();
  for(const q of terms){
    const d=await forumGet('/search.json?q='+encodeURIComponent(q),auth);
    if(!d)continue;
    for(const p of(d.posts||[])){
      if(!seenTopics.has(p.topic_id)){
        refs.push({topicId:p.topic_id,postNum:p.post_number,user:p.username,excerpt:strip(p.blurb),date:p.created_at});
        seenTopics.add(p.topic_id);
      }
    }
    for(const t of(d.topics||[])){
      if(!seenTopics.has(t.id)){refs.push({topicId:t.id,title:t.title,posts:t.posts_count});seenTopics.add(t.id)}
    }
    console.log('  "'+q+'":',d.posts?.length||0,'posts,',(d.topics||[]).length,'topics');
    await sleep(1000);
  }
  console.log('  Total unique refs:',refs.length);
  return refs;
}

// 8. Fetch full thread content for important topics
async function fetchFullThread(topicId,auth){
  const d=await forumGet('/t/'+topicId+'.json',auth);
  if(!d)return null;
  const posts=d.post_stream?.posts||[];
  const allPosts=[];
  for(const p of posts)allPosts.push({num:p.post_number,user:p.username,text:strip(p.cooked),date:p.created_at,replyTo:p.reply_to_post_number});
  // If thread has more posts, fetch remaining
  const stream=d.post_stream?.stream||[];
  if(stream.length>posts.length){
    const remaining=stream.filter(id=>!posts.find(p=>p.id===id));
    for(let i=0;i<remaining.length;i+=20){
      const chunk=remaining.slice(i,i+20);
      const r=await forumGet('/t/'+topicId+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&'),auth);
      if(r?.post_stream?.posts)for(const p of r.post_stream.posts)allPosts.push({num:p.post_number,user:p.username,text:strip(p.cooked),date:p.created_at,replyTo:p.reply_to_post_number});
      await sleep(300);
    }
  }
  return{id:topicId,title:d.title,posts:allPosts.sort((a,b)=>a.num-b.num),category:d.category_id};
}

// Extract ALL fingerprints and device info from all collected data
function extractAllDeviceInfo(data){
  const allText=[];
  for(const t of(data.topics||[]))allText.push(t.title||'');
  for(const a of(data.activity||[]))allText.push((a.title||'')+' '+(a.excerpt||''));
  for(const r of(data.references||[]))allText.push((r.title||'')+' '+(r.excerpt||''));
  for(const bm of(data.bookmarks||[]))allText.push((bm.title||'')+' '+(bm.excerpt||''));
  for(const t of(data.fullThreads||[]))for(const p of(t.posts||[]))allText.push(p.text||'');
  for(const m of(data.pms||[]))allText.push(m.title||'');
  for(const n of(data.notifications||[]))allText.push(JSON.stringify(n.data||''));
  const combined=allText.join(' ');
  const foundFPs=extractFP(combined);
  const mfrs=extractMfrFromText(combined);
  const allFPs=[...new Set([...foundFPs,...mfrs.filter(m=>m.startsWith('_T'))])];
  const supported=allFPs.filter(fp=>fps.has(fp));
  const unsupported=allFPs.filter(fp=>!fps.has(fp));
  return{allFPs,supported,unsupported};
}

async function main(){
  console.log('=== Forum Activity Scraper ===');
  console.log('User:',USERNAME,'| App: v'+appVer,'| Known FPs:',fps.size);
  const state=loadState();
  const auth=await(async()=>{const{getForumAuth}=require('./forum-auth');return getForumAuth()})();
  if(!auth)console.log('WARNING: No forum auth - public endpoints only');

  // Collect everything
  const data={timestamp:new Date().toISOString(),username:USERNAME};
  data.summary=await getUserSummary(auth);await sleep(500);
  data.topics=await getUserTopics(auth);await sleep(500);
  data.activity=await getUserActivity(auth);await sleep(500);
  data.pms=await getPrivateMessages(auth);await sleep(500);
  data.notifications=await getNotifications(auth);await sleep(500);
  data.bookmarks=await getBookmarks(auth);await sleep(500);
  data.references=await searchProjectReferences(auth);await sleep(500);

  // Identify important topics to fetch in full
  const importantTopicIds=new Set();
  // All user topics
  for(const t of(data.topics||[]))importantTopicIds.add(t.id);
  // Referenced topics
  for(const r of(data.references||[]))if(r.topicId)importantTopicIds.add(r.topicId);
  // Bookmarked topics
  for(const bm of(data.bookmarks||[]))if(bm.topicId)importantTopicIds.add(bm.topicId);
  // Notification topics (replies, mentions, quotes)
  for(const n of(data.notifications||[]))if(n.topicId)importantTopicIds.add(n.topicId);

  // Fetch full threads (limit to 30 to stay within rate limits)
  const topicList=[...importantTopicIds].slice(0,30);
  console.log('\n== Fetching',topicList.length,'full threads ==');
  data.fullThreads=[];
  for(const tid of topicList){
    const thread=await fetchFullThread(tid,auth);
    if(thread){data.fullThreads.push(thread);console.log('  Topic',tid,':',thread.posts.length,'posts -',thread.title?.slice(0,50))}
    await sleep(500);
  }

  // Extract device info from everything
  console.log('\n== Extracting device info ==');
  data.deviceInfo=extractAllDeviceInfo(data);
  console.log('  Found FPs:',data.deviceInfo.allFPs.length,'| Supported:',data.deviceInfo.supported.length,'| Unsupported:',data.deviceInfo.unsupported.length);

  // AI analysis of all collected data
  console.log('\n== AI Analysis ==');
  const aiInput={username:USERNAME,appVersion:appVer,summary:data.summary,topicCount:data.topics?.length,activityCount:data.activity?.length,
    pmCount:data.pms?.length,refCount:data.references?.length,bookmarkCount:data.bookmarks?.length,
    unsupportedFPs:data.deviceInfo.unsupported.slice(0,20),recentActivity:(data.activity||[]).slice(0,15).map(a=>a.title+' ('+a.excerpt?.slice(0,80)+')')};
  const aiPrompt='Analyze this Homey community forum activity for the Universal Tuya Zigbee app maintainer. Summarize: 1) Key user requests, 2) Devices people need, 3) Issues to fix, 4) Action items. Max 300 words. Focus on actionable insights.';
  const ai=await callAI(JSON.stringify(aiInput,null,2),aiPrompt,{maxTokens:1024});
  data.aiAnalysis=ai?ai.text:null;
  if(data.aiAnalysis)console.log('  AI analysis:',data.aiAnalysis.length,'chars');

  // Save everything
  fs.mkdirSync(path.dirname(DATA_F),{recursive:true});
  fs.writeFileSync(DATA_F,JSON.stringify(data,null,2)+'\n');
  const report={timestamp:data.timestamp,username:USERNAME,topicCount:data.topics?.length||0,activityCount:data.activity?.length||0,
    pmCount:data.pms?.length||0,refCount:data.references?.length||0,bookmarkCount:data.bookmarks?.length||0,
    fullThreads:data.fullThreads?.length||0,totalFPs:data.deviceInfo?.allFPs?.length||0,
    unsupportedFPs:data.deviceInfo?.unsupported||[],aiAnalysis:data.aiAnalysis};
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2)+'\n');
  saveState({...state,lastRun:new Date().toISOString()});

  // Summary
  console.log('\n=== Results ===');
  console.log('Topics:',data.topics?.length,'| Activity:',data.activity?.length,'| PMs:',data.pms?.length);
  console.log('References:',data.references?.length,'| Bookmarks:',data.bookmarks?.length,'| Full threads:',data.fullThreads?.length);
  console.log('FPs found:',data.deviceInfo?.allFPs?.length,'| Unsupported:',data.deviceInfo?.unsupported?.length);

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Forum Activity Scraper (@'+USERNAME+')\n| Metric | Count |\n|---|---|\n';
    md+='| Topics created | '+(data.topics?.length||0)+' |\n';
    md+='| Activity stream | '+(data.activity?.length||0)+' |\n';
    md+='| Private messages | '+(data.pms?.length||0)+' |\n';
    md+='| Project references | '+(data.references?.length||0)+' |\n';
    md+='| Bookmarks | '+(data.bookmarks?.length||0)+' |\n';
    md+='| Full threads fetched | '+(data.fullThreads?.length||0)+' |\n';
    md+='| Fingerprints found | '+(data.deviceInfo?.allFPs?.length||0)+' |\n';
    md+='| Unsupported FPs | '+(data.deviceInfo?.unsupported?.length||0)+' |\n';
    if(data.deviceInfo?.unsupported?.length)md+='\n**Unsupported:** '+data.deviceInfo.unsupported.slice(0,20).map(f=>''+f+'').join(', ')+'\n';
    if(data.aiAnalysis)md+='\n### AI Analysis\n'+data.aiAnalysis+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
