#!/usr/bin/env node
'use strict';
// v5.11.27: Bot Self-Audit — checks past bot replies for accuracy against current driver DB
// Detects: "not found" for now-supported devices, wrong driver suggestions, stale info
const fs=require('fs'),path=require('path');
const{buildFullIndex,extractAllFP}=require('./load-fingerprints');
const{validateReply}=require('./reply-quality-gate');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE_DIR=path.join(__dirname,'..','state');
const FORUM=process.env.DISCOURSE_URL||'https://community.homey.app';

async function fetchBotReplies(topicIds){
  const apiKey=process.env.DISCOURSE_API_KEY;
  const apiUser=process.env.DISCOURSE_API_USERNAME||'dlnraja';
  const replies=[];
  if(!apiKey){console.log('No DISCOURSE_API_KEY, using cached data');return loadCachedReplies();}

  for(const tid of topicIds){
    try{
      const r=await fetch(FORUM+'/t/'+tid+'.json?print=true',{
        headers:{'Api-Key':apiKey,'Api-Username':apiUser}});
      if(!r.ok)continue;
      const data=await r.json();
      const posts=data.post_stream?.posts||[];
      for(const p of posts){
        // Find our replies (from dlnraja or containing old bot signature)
        if(p.username==='dlnraja'||/Bot Universal Tuya Zigbee|Universal Tuya Zigbee v/i.test(p.cooked)){
          // Find the post it was replying to
          const replyTo=posts.find(rp=>rp.post_number===p.reply_to_post_number);
          replies.push({
            topic:tid,
            postNumber:p.post_number,
            replyText:stripHtml(p.cooked),
            originalText:replyTo?stripHtml(replyTo.cooked):'',
            originalUser:replyTo?.username||'',
            date:p.created_at
          });
        }
      }
    }catch(e){console.warn('Fetch T'+tid+':',e.message)}
  }
  return replies;
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

  const replies=await fetchBotReplies(topicIds);
  console.log('Found',replies.length,'bot replies');

  // Cache replies for offline use
  const cacheFile=path.join(STATE_DIR,'bot-replies-cache.json');
  fs.mkdirSync(STATE_DIR,{recursive:true});
  if(replies.length)fs.writeFileSync(cacheFile,JSON.stringify(replies,null,2));

  const issues=auditReplies(replies);
  console.log('Issues:',issues.length,'/',replies.length,'replies');

  for(const i of issues){
    console.log('  T'+i.topic+' #'+i.post+' @'+i.user+':');
    for(const w of i.warnings)console.log('    ⚠',w);
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
