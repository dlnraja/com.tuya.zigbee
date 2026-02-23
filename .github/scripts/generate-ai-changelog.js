#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const{callAI}=require('./ai-helper');
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const SD=path.join(__dirname,'..','state');
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';

// Gather all context for AI-powered changelog generation
async function gatherContext(){
  const ctx={};
  // 1. App version + stats
  try{const a=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8'));
    ctx.version=a.version;ctx.appName=a.name?.en||'Universal Tuya Zigbee';}catch{}
  // Driver count + fingerprint count
  try{const dirs=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));
    ctx.driverCount=dirs.length;
    let fpCount=0;for(const d of dirs){const c=fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8');
      fpCount+=(c.match(/"_T[A-Za-z0-9_]+"/g)||[]).length;}
    ctx.fpCount=fpCount;}catch{}

  // 2. Git commits since last tag
  try{const tag=execSync('git describe --tags --abbrev=0 2>/dev/null||echo ""',{cwd:ROOT,encoding:'utf8'}).trim();
    const cmd=tag?'git log '+tag+'..HEAD --pretty=format:"%h|%s|%an|%ai" --no-merges':'git log -20 --pretty=format:"%h|%s|%an|%ai" --no-merges';
    ctx.commits=execSync(cmd,{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean).map(l=>{
      const[hash,msg,author,date]=l.split('|');return{hash,msg,author,date:date?.substring(0,10)};});}catch{ctx.commits=[];}

  // 3. Git diff stats (files changed)
  try{const tag=execSync('git describe --tags --abbrev=0 2>/dev/null||echo ""',{cwd:ROOT,encoding:'utf8'}).trim();
    const cmd=tag?'git diff --stat '+tag+'..HEAD':'git diff --stat HEAD~20..HEAD';
    ctx.diffStats=execSync(cmd,{cwd:ROOT,encoding:'utf8'}).trim().substring(0,2000);}catch{ctx.diffStats='';}

  // 4. Forum scan results
  try{const f=path.join(SD,'nightly-report.json');if(fs.existsSync(f)){
    const r=JSON.parse(fs.readFileSync(f,'utf8'));
    ctx.forumResults={count:r.forum||0,details:(r.forumDetails||[]).slice(0,10).map(d=>({topic:d.topic,post:d.post,user:d.user,fps:d.fps}))};}}catch{}

  // 5. GitHub activity
  try{const f=path.join(SD,'nightly-report.json');if(fs.existsSync(f)){
    const r=JSON.parse(fs.readFileSync(f,'utf8'));
    ctx.githubResults={count:r.github||0,details:(r.githubDetails||[]).slice(0,10).map(d=>({repo:d.repo,number:d.number,user:d.user,fps:d.fps,title:d.title}))};}}catch{}

  // 6. Gmail diagnostics
  try{const f=path.join(SD,'diagnostics-report.json');if(fs.existsSync(f)){
    const r=JSON.parse(fs.readFileSync(f,'utf8'));
    ctx.gmailDiag={count:r.count||0,byType:r.byType||{},newFPs:r.newFingerprints||[]};}}catch{}

  // 7. Device interviews
  try{const f=path.join(ROOT,'docs','data','DEVICE_INTERVIEWS.json');if(fs.existsSync(f)){
    const r=JSON.parse(fs.readFileSync(f,'utf8'));
    ctx.interviews={count:Array.isArray(r)?r.length:Object.keys(r).length};}}catch{}

  // 8. Forum scan discovery
  try{if(fs.existsSync('/tmp/forum_issues.json')){
    const r=JSON.parse(fs.readFileSync('/tmp/forum_issues.json','utf8'));
    ctx.forumIssues=r.slice(0,15).map(i=>({user:i.user,missing:i.missing,found:i.found?.length||0}));}}catch{}

  return ctx;
}

// Generate AI-powered changelog using Gemini
async function generateChangelog(ctx){
  const commitList=ctx.commits.map(c=>c.hash+' '+c.msg).join('\n');
  const prompt='Generate a professional, user-friendly changelog entry for Universal Tuya Zigbee app v'+ctx.version+'.\n\n'+
    'CONTEXT:\n'+
    '- App: '+ctx.driverCount+' drivers, '+ctx.fpCount+' fingerprints\n'+
    '- Git commits since last release:\n'+commitList+'\n'+
    '- Files changed:\n'+(ctx.diffStats||'none')+'\n'+
    (ctx.forumResults?'- Forum activity: '+ctx.forumResults.count+' replies, topics: '+JSON.stringify(ctx.forumResults.details?.slice(0,5))+'\n':'')+
    (ctx.githubResults?'- GitHub activity: '+ctx.githubResults.count+' responses, issues: '+JSON.stringify(ctx.githubResults.details?.slice(0,5))+'\n':'')+
    (ctx.gmailDiag?'- Gmail diagnostics: '+ctx.gmailDiag.count+' emails, new FPs: '+JSON.stringify(ctx.gmailDiag.newFPs?.slice(0,10))+'\n':'')+
    (ctx.forumIssues?'- Forum device requests: '+JSON.stringify(ctx.forumIssues.slice(0,5))+'\n':'')+
    (ctx.interviews?'- Device interviews: '+ctx.interviews.count+' in database\n':'')+
    '\nOUTPUT FORMAT (return ONLY valid JSON, no markdown):\n'+
    '{\n'+
    '  "homeyChangelog": "One-line summary for Homey App Store (max 400 chars, plain text, no markdown)",\n'+
    '  "changelogMd": "Markdown changelog section with ### headers (Bug Fixes, New Features, Improvements, CI/CD). Use bullet points. Be specific about what changed. Max 500 words.",\n'+
    '  "readmeUpdate": "One-line for README table (max 100 chars)",\n'+
    '  "appDescription": "Updated app.json description in English (max 200 chars, include driver/FP counts)"\n'+
    '}';

  const sysPrompt='You are a changelog generator for a Homey Zigbee smart home app. Generate professional, accurate changelogs based on git commits and cross-referenced data from forum, GitHub, Gmail, and device interviews. Focus on user-visible changes. Never invent features not in the commits. Be concise but informative.';
  const ai=await callAI(prompt,sysPrompt,{maxTokens:2048});
  if(!ai)return null;
  try{const j=ai.text.match(/\{[\s\S]*\}/);return j?JSON.parse(j[0]):null;}
  catch(e){console.warn('AI parse error:',e.message);return null;}
}

// Fallback: template-based changelog from commits
function templateChangelog(ctx){
  const fixes=ctx.commits.filter(c=>/fix|bug|crash|error/i.test(c.msg));
  const feats=ctx.commits.filter(c=>/feat|add|new|support/i.test(c.msg));
  const ci=ctx.commits.filter(c=>/ci|workflow|yml|action|deploy/i.test(c.msg));
  const other=ctx.commits.filter(c=>!fixes.includes(c)&&!feats.includes(c)&&!ci.includes(c));

  let md='';
  if(feats.length){md+='### New Features\n';for(const c of feats)md+='- '+c.msg+'\n';md+='\n';}
  if(fixes.length){md+='### Bug Fixes\n';for(const c of fixes)md+='- '+c.msg+'\n';md+='\n';}
  if(ci.length){md+='### CI/CD\n';for(const c of ci)md+='- '+c.msg+'\n';md+='\n';}
  if(other.length){md+='### Other\n';for(const c of other)md+='- '+c.msg+'\n';md+='\n';}

  const summary=ctx.commits.slice(0,3).map(c=>c.msg.substring(0,80)).join('. ');
  return{
    homeyChangelog:'v'+ctx.version+': '+summary.substring(0,380),
    changelogMd:md||'- Performance and stability improvements\n',
    readmeUpdate:summary.substring(0,100)||'Performance improvements',
    appDescription:'Control your Tuya Zigbee + WiFi devices locally! '+ctx.driverCount+' drivers, '+(ctx.fpCount||'5500+')+' fingerprints, 1,457+ flow cards.'
  };
}

// Update .homeychangelog.json
function updateHomeyChangelog(version,text){
  const f=path.join(ROOT,'.homeychangelog.json');
  let cl={};try{cl=JSON.parse(fs.readFileSync(f,'utf8'))}catch{}
  cl[version]={en:text.substring(0,400)};
  // Keep last 20 versions, sorted newest first
  const sorted=Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).slice(0,20);
  const out={};for(const k of sorted)out[k]=cl[k];
  fs.writeFileSync(f,JSON.stringify(out,null,2)+'\n');
  console.log('Updated .homeychangelog.json: v'+version);
}

// Update CHANGELOG.md
function updateChangelogMd(version,md){
  const f=path.join(ROOT,'CHANGELOG.md');
  if(!fs.existsSync(f))return;
  let content=fs.readFileSync(f,'utf8');
  const today=new Date().toISOString().split('T')[0];
  const header='## ['+version+'] - '+today+'\n\n';
  // Check if version already exists
  if(content.includes('['+version+']')){console.log('CHANGELOG.md already has v'+version);return;}
  // Insert after the --- line after the header
  const insertPoint=content.indexOf('---\n\n##');
  if(insertPoint>0){
    content=content.substring(0,insertPoint)+'---\n\n'+header+md+'\n---\n\n'+content.substring(insertPoint+7);
  }else{
    const firstH2=content.indexOf('\n## ');
    if(firstH2>0)content=content.substring(0,firstH2)+'\n'+header+md+'\n---\n'+content.substring(firstH2);
  }
  fs.writeFileSync(f,content);
  console.log('Updated CHANGELOG.md: v'+version);
}

// Update README.md Latest Updates table
function updateReadme(version,oneLiner){
  const f=path.join(ROOT,'README.md');
  if(!fs.existsSync(f))return;
  let content=fs.readFileSync(f,'utf8');
  const today=new Date().toISOString().split('T')[0];
  // Update Last Updated date
  content=content.replace(/\| \*\*Last Updated\*\* \| [^|]+\|/,'| **Last Updated** | '+today+' |');
  // Add row to Latest Updates table
  const newRow='| **v'+version+'** | '+oneLiner+' |';
  const marker='<!-- CHANGELOG_START';
  const tableStart=content.indexOf('| Version | Feature |');
  if(tableStart>0){
    const tableHeaderEnd=content.indexOf('\n',content.indexOf('\n',tableStart)+1);
    if(tableHeaderEnd>0&&!content.includes('v'+version)){
      content=content.substring(0,tableHeaderEnd+1)+newRow+'\n'+content.substring(tableHeaderEnd+1);
    }
  }
  // Update driver/FP counts in badges and stats
  fs.writeFileSync(f,content);
  console.log('Updated README.md: v'+version);
}

async function main(){
  console.log('=== AI Changelog Generator ===');
  const ctx=await gatherContext();
  console.log('Version:',ctx.version,'| Commits:',ctx.commits.length,'| Drivers:',ctx.driverCount,'| FPs:',ctx.fpCount);
  if(ctx.forumResults)console.log('Forum:',ctx.forumResults.count,'replies');
  if(ctx.githubResults)console.log('GitHub:',ctx.githubResults.count,'responses');
  if(ctx.gmailDiag)console.log('Gmail:',ctx.gmailDiag.count,'emails, new FPs:',ctx.gmailDiag.newFPs?.length||0);

  if(!ctx.commits.length){console.log('No new commits — skipping changelog');return;}

  // Try AI first, fallback to template
  let cl=await generateChangelog(ctx);
  if(!cl){console.log('AI failed, using template');cl=templateChangelog(ctx);}
  else console.log('AI changelog generated');

  // Update all files
  updateHomeyChangelog(ctx.version,cl.homeyChangelog);
  updateChangelogMd(ctx.version,cl.changelogMd);
  updateReadme(ctx.version,cl.readmeUpdate);

  // Summary
  const summary='## AI Changelog Generator\n- Version: v'+ctx.version+'\n- Commits: '+ctx.commits.length+'\n- Sources: git'+(ctx.forumResults?' + forum':'')+
    (ctx.githubResults?' + github':'')+(ctx.gmailDiag?' + gmail':'')+'\n- Changelog: '+cl.homeyChangelog.substring(0,150)+'...\n';
  fs.appendFileSync(SUM,summary);
  console.log('\n=== Done ===');
}
main().catch(e=>{console.error(e.message);process.exit(0);});
