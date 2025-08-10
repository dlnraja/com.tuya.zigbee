'use strict';
const fs=require('fs'),fsp=require('fs/promises'),path=require('path'),{spawnSync}=require('child_process');
const ROOT=process.cwd(),DRV=path.join(ROOT,'drivers'),TMP=path.join(ROOT,'.tmp_tuya_zip_work');
const CI=process.env.CI==='1';

async function runScript(name,args=[]){
  const script=path.join(ROOT,'scripts',name);
  if(!fs.existsSync(script)){console.log(`[mega] ${name} not found`);return false;}
  console.log(`[mega] running ${name} ${args.join(' ')}`);
  const result=spawnSync('node',[script,...args],{stdio:'inherit',cwd:ROOT});
  return result.status===0;
}

async function runHomey(){
  if(CI){console.log('[mega] CI mode, skipping run');return true;}
  console.log('[mega] attempting to run app...');
  try{
    const result=spawnSync('homey',['app','run'],{stdio:'pipe',cwd:ROOT});
    if(result.status===0)return true;
    if(process.env.HOMEY_TOKEN||process.env.HOMEY_ACCESS_TOKEN){
      console.log('[mega] trying remote run...');
      const remote=spawnSync('homey',['app','run','--remote'],{stdio:'pipe',cwd:ROOT});
      return remote.status===0;
    }
  }catch(e){console.log('[mega] run failed:',e.message);}
  return false;
}

async function gitCommit(){
  if(CI){console.log('[mega] CI mode, skipping git');return true;}
  try{
    const user=process.env.GIT_USER||'Local Dev',email=process.env.GIT_EMAIL||'dev@localhost';
    spawnSync('git',['config','user.name',user],{stdio:'pipe',cwd:ROOT});
    spawnSync('git',['config','user.email',email],{stdio:'pipe',cwd:ROOT});
    spawnSync('git',['add','.'],{stdio:'pipe',cwd:ROOT});
    const msg=`Auto-reorganize drivers ${new Date().toISOString()}`;
    const commit=spawnSync('git',['commit','-m',msg],{stdio:'pipe',cwd:ROOT});
    if(commit.status===0){
      console.log('[mega] committed');
      const push=spawnSync('git',['push'],{stdio:'pipe',cwd:ROOT});
      if(push.status===0)console.log('[mega] pushed');
      return true;
    }
  }catch(e){console.log('[mega] git failed:',e.message);}
  return false;
}

(async()=>{
  console.log('🚀 MEGA-PROMPT EXECUTION STARTED');
  console.log(`📁 Root: ${ROOT}`);
  console.log(`📁 Drivers: ${DRV}`);
  console.log(`📁 Temp: ${TMP}`);
  
  // 1. Fix package.json
  await runScript('fix-package.js');
  
  // 2. Ingest ZIPs (skip if no new ones)
  if(fs.existsSync(TMP)&&fs.readdirSync(TMP).length>0){
    console.log('[mega] temp dir exists, skipping ingest');
  }else{
    await runScript('ingest-tuya-zips.js');
  }
  
  // 3. Enrich drivers
  await runScript('enrich-drivers.js',['--apply']);
  
  // 4. Reorganize structure
  await runScript('reorganize-drivers.js');
  
  // 5. Generate assets
  await runScript('assets-generate.js');
  
  // 6. Try to run
  await runHomey();
  
  // 7. Git operations
  await gitCommit();
  
  console.log('✅ MEGA-PROMPT EXECUTION COMPLETED');
})().catch(e=>{console.error('[mega] fatal:',e);process.exitCode=1;});
