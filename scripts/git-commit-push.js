'use strict';
const {spawnSync}=require('child_process');
const msg = process.argv.slice(2).join(' ') || 'chore: batch update';
function run(c,a){ 
  console.log(`[git] Running: ${c} ${a.join(' ')}`);
  return spawnSync(c,a,{stdio:'inherit',shell:process.platform==='win32'}).status===0; 
}

// Configure git user if not set
try { 
  run('git',['config','--local','user.name', process.env.GIT_USER||'tuya-bot']); 
  run('git',['config','--local','user.email', process.env.GIT_EMAIL||'tuya-bot@local']); 
}} catch (error) {}

// Check if there are changes
const hasChanges = spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim();
if (!hasChanges) {
  console.log('[git] No changes to commit');
  process.exit(0);
}

console.log('[git] Changes detected, committing...');
run('git',['add','-A']);
if (run('git',['commit','-m',msg])) {
  console.log('[git] Commit successful, pushing...');
  run('git',['push']) || console.log('[git] Push failed, but continuing...');
} else {
  console.log('[git] Commit failed or no changes');
}