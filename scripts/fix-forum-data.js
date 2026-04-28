#!/usr/bin/env node
'use strict';
/**
 * Fix corrupted forum-activity-data.json
 * Removes bad control characters and re-saves
 */
const fs=require('fs'),path=require('path');

const STATE_F=path.join(__dirname,'..','.github','state','forum-activity-data.json');
const BACKUP_F=path.join(__dirname,'..','.github','state','forum-activity-data.corrupted.json');
const FIXED_F=path.join(__dirname,'..','.github','state','forum-activity-data.json');

console.log('Fixing forum activity data...\n');

// Read raw file
const raw=fs.readFileSync(STATE_F,'utf8');
console.log('Original size:',raw.length,'chars');

// Create backup
fs.copyFileSync(STATE_F,BACKUP_F);
console.log('Backup created:',BACKUP_F);

// Fix control characters (replace \r, \n in strings with actual newlines)
let fixed=raw;

// Remove null bytes and other control chars except tab, newline
fixed=fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');

// Try to parse
let data;
try{
  data=JSON.parse(fixed);
  console.log('Parsed successfully!');
  console.log('Keys:',Object.keys(data).join(', '));
  
  // Report summary
  if(data.recentPosts)console.log('Recent posts:',data.recentPosts.length);
  if(data.deviceRequests)console.log('Device requests:',data.deviceRequests.length);
  if(data.unsupportedFPs)console.log('Unsupported FPs:',data.unsupportedFPs.length);
  if(data.activity)console.log('Activity entries:',data.activity.length);
  if(data.topicCount)console.log('Topic count:',data.topicCount);
  
  // Save fixed version
  fs.writeFileSync(FIXED_F,JSON.stringify(data,null,2));
  console.log('\nFixed file saved:',FIXED_F);
  console.log('New size:',fs.readFileSync(FIXED_F,'utf8').length,'chars');
  
}catch(e){
  console.error('Parse error:',e.message);
  console.log('\nTrying regex repair...');
  
  // Try to extract and fix each field
  const extractObj=(txt,start)=>{
    let depth=0,end=start;
    for(let i=start;i<txt.length;i++){
      if(txt[i]==='{'&&txt[i-1]!=='\\')depth++;
      else if(txt[i]==='}'&&txt[i-1]!=='\\'){depth--;if(depth===0){end=i+1;break}}
    }
    return txt.slice(start,end);
  };
  
  // If we can fix, do it
  if(raw.includes('{"recentPosts"')){
    console.log('Found recentPosts field');
  }
  console.log('\nManual repair may be needed. Original file backed up.');
}