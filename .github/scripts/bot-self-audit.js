#!/usr/bin/env node
'use strict';
// v5.11.29: Reply Self-Audit  checks past replies for accuracy against current driver DB
// Detects: "not found" for now-supported devices, wrong driver suggestions, stale info
// Also detects: hidden/flagged posts, consecutive messages, bot signatures
const fs=require('fs'),path=require('path');
const{buildFullIndex,extractAllFP}=require('./load-fingerprints');
const{validateReply}=require('./reply-quality-gate');
const{fetchWithRetry}=require('./retry-helper');
const{getForumAuth,fmtCk}=require('./forum-auth');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE_DIR=path.join(__dirname,'..','state');
const FORUM=process.env.DISCOURSE_URL||'https://community.homey.app';

async function fetchBotReplies(topicIds){
  const auth=await getForumAuth();
  const replies=[];
  const hiddenPosts=[];
  const consecutivePosts=[];
  const botSignaturePosts=[];
  if(!auth){console.log('No forum auth, using cached data');return{replies:loadCachedReplies(),hiddenPosts:[],consecutivePosts:[],botSignaturePosts:[]};}
  const hdrs=auth.type==='session'?{'X-CSRF-Token':auth.csrf,Cookie:fmtCk(auth.cookies)}:{};

  for(const tid of topicIds){
    try{
      const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json?print=true',{
        headers:hdrs},{retries:2,label:'audit'});
      if(!r.ok)continue;
      const data=await r.json();
      const posts=data.post_stream?.posts||[];
      let prevUser=null;
      for(const p of posts){
        // Detect hidden/flagged posts
        if(p.hidden&&p.username==='dlnraja'){
          hiddenPosts.push({topic:tid,post:p.post_number,id:p.id,date:p.created_at,
            reason:p.hidden_reason_id||'unknown'});
          console.log('  \u26a0 HIDDEN T'+tid+' #'+p.post_number+' (id='+p.id+')');
        }
        // Detect consecutive dlnraja posts (spam risk)
        if(p.username==='dlnraja'&&prevUser==='dlnraja'){
          consecutivePosts.push({topic:tid,post:p.post_number,id:p.id,date:p.created_at});
        }
        // Detect old bot signatures still present
        if(p.username==='dlnraja'&&/Auto-response by dlnraja|Bot Universal Tuya|Install test version\s*$/i.test(stripHtml(p.cooked))){
          botSignaturePosts.push({topic:tid,post:p.post_number,id:p.id,date:p.created_at});
        }
        prevUser=p.username;
        // Find our replies
        if(p.username==='dlnraja'||/Bot Universal Tuya Zigbee|Universal Tuya Zigbee v/i.test(p.cooked)){
          const replyTo=posts.find(rp=>rp.post_number===p.reply_to_post_number);
          replies.push({
            topic:tid,
            postNumber:p.post_number,
            replyText:stripHtml(p.cooked),
            originalText:replyTo?stripHtml(replyTo.cooked):'',
            originalUser:replyTo?.username||'',
            date:p.created_at,
            hidden:!!p.hidden
          });
        }
      }
    }catch(e){console.warn('Fetch T'+tid+':',e.message)}
  }
  return{replies,hiddenPosts,consecutivePosts,botSignaturePosts};
}

function loadCachedReplies(){
  const file=path.join(STATE_DIR,'bot-replies-cache.json');
  if(fs.existsSync(file)){
    try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
  }
  return[];
}

function stripHtml(html){
  return(html||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim();
}

function auditReplies(replies){
  const{mfrIdx,pidIdx,allMfrs,allPids}=buildFullIndex(DDIR);
  const issues=[];

  for(const reply of replies){
    const result=validateReply(reply.replyText, reply.originalText);
    if(!result.valid){
      issues.push({
        topic:reply.topic,
        post:reply.postNumber,
        user:reply.originalUser,
        date:reply.date,
        warnings:result.warnings,
        corrected:result.corrected
      });
    }

    // Additional: check if bot said NULL/no-reply for a post with valid FPs
    if(!reply.replyText&&reply.originalText){
      const fps=extractAllFP(reply.originalText,allMfrs,allPids);
      const found=[...fps.mfr,...fps.pid].filter(fp=>mfrIdx.has(fp)||pidIdx.has(fp));
      if(found.length){
        issues.push({
          topic:reply.topic,
          post:reply.postNumber,
          user:reply.originalUser,
          date:reply.date,
          warnings:['MISSED: Post had supported FPs ('+found.join(', ')+') but bot did not reply'],
          corrected:null
        });
      }
    }
  }
  return issues;
}

function generateReport(issues,totalReplies){
  let md='## Bot Self-Audit Report\n\n';
  md+='| Metric | Value |\n|---|---|\n';
  md+='| Replies audited | '+totalReplies+' |\n';
  md+='| Issues found | '+issues.length+' |\n';
  md+='| Accuracy | '+(totalReplies?Math.round((1-issues.length/totalReplies)*100):0)+'% |\n\n';

  if(!issues.length){md+='All bot replies are accurate against current driver DB.\n';return md;}

  md+='### Issues Found\n\n';
  for(const issue of issues){
    md+='**Topic '+issue.topic+' #'+issue.post+'** (@'+issue.user+')\n';
    for(const w of issue.warnings) md+='- '+w+'\n';
    if(issue.corrected) md+='- **Correction needed**: Reply should mention supported device\n';
    md+='\n';
  }
  return md;
}

async function main(){
  console.log('=== Bot Self-Audit ===');
  const topicIds=(process.env.FORUM_TOPICS||process.env.AUDIT_TOPICS||'140352,26439,146735,89271,54018,12758,85498').split(',').map(Number);
  console.log('Auditing',topicIds.length,'topics...');

  const result=await fetchBotReplies(topicIds);
  const{replies,hiddenPosts,consecutivePosts,botSignaturePosts}=result;
  console.log('Found',replies.length,'replies,',hiddenPosts.length,'hidden,',
    consecutivePosts.length,'consecutive,',botSignaturePosts.length,'with bot sigs');

  // Cache replies for offline use
  const cacheFile=path.join(STATE_DIR,'bot-replies-cache.json');
  fs.mkdirSync(STATE_DIR,{recursive:true});
  if(replies.length)fs.writeFileSync(cacheFile,JSON.stringify(replies,null,2));

  const issues=auditReplies(replies);
  // Add hidden/consecutive/botSig issues
  for(const h of hiddenPosts)issues.push({topic:h.topic,post:h.post,user:'dlnraja',date:h.date,
    warnings:['POST HIDDEN by community (spam flag)  id='+h.id],corrected:null});
  for(const c of consecutivePosts)issues.push({topic:c.topic,post:c.post,user:'dlnraja',date:c.date,
    warnings:['CONSECUTIVE dlnraja post  should edit previous instead'],corrected:null});
  for(const b of botSignaturePosts)issues.push({topic:b.topic,post:b.post,user:'dlnraja',date:b.date,
    warnings:['OLD BOT SIGNATURE still present  edit to remove'],corrected:null});
  // Save hidden posts state for cleanup
  if(hiddenPosts.length||consecutivePosts.length||botSignaturePosts.length){
    const auditState={date:new Date().toISOString(),hiddenPosts,consecutivePosts,botSignaturePosts};
    fs.writeFileSync(path.join(STATE_DIR,'audit-flagged.json'),JSON.stringify(auditState,null,2));
  }
  console.log('Issues:',issues.length,'/',replies.length,'replies');

  for(const i of issues){
    console.log('  T'+i.topic+' #'+i.post+' @'+i.user+':');
    for(const w of i.warnings)console.log('    ',w);
  }

  const report=generateReport(issues,replies.length);
  fs.writeFileSync(path.join(STATE_DIR,'bot-audit-report.md'),report);

  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'replies_audited='+replies.length+'\n'+
      'issues_found='+issues.length+'\n'+
      'accuracy='+(replies.length?Math.round((1-issues.length/replies.length)*100):0)+'\n');
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
