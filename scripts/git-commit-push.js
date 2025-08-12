'use strict';
const {spawnSync}=require('child_process');
const msg = process.argv.slice(2).join(' ') || 'chore: batch update';
function run(c,a){ return spawnSync(c,a,{stdio:'inherit',shell:process.platform==='win32'}).status===0; }
try{ run('git',['config','--local','user.name', process.env.GIT_USER||'auto-bot']); run('git',['config','--local','user.email', process.env.GIT_EMAIL||'bot@local']); }catch{}
run('git',['add','-A']);
run('git',['commit','-m',msg]) || true;
run('git',['push']) || true;