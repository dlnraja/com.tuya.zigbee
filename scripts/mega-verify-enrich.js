'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
function run(c,a){return spawnSync(c,a,{stdio:'inherit',shell:process.platform==='win32'}).status===0;}
function tryRun(c,a){try{return run(c,a);}catch{return false;}}
function log(m){console.log('[mega]',m);}
function flattenVariants(){
  const root=path.join(process.cwd(),'drivers');if(!fs.existsSync(root))return;
  const st=[root];const merged=[];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}
    if(s.isDirectory()){const es=fs.readdirSync(cur,{withFileTypes:true});
      for(const e of es){const p=path.join(cur,e.name);
        if(e.isDirectory()){if(e.name==='variants'){ // aplatir
          const items=fs.readdirSync(p,{withFileTypes:true});
          for(const it of items){const vdir=path.join(p,it.name);const comp=['driver.compose.json','driver.json'].map(n=>path.join(vdir,n)).find(x=>fs.existsSync(x));
            if(comp){const parent=cur;const parentCompose=['driver.compose.json','driver.json'].map(n=>path.join(parent,n)).find(x=>fs.existsSync(x));
              let base={id:path.basename(parent),name:{en:path.basename(parent),fr:path.basename(parent)},capabilities:[],zigbee:{}};
              if(parentCompose)try{base=JSON.parse(fs.readFileSync(parentCompose,'utf8'));}catch{}
              let add={};try{add=JSON.parse(fs.readFileSync(comp,'utf8'));}catch{}
              // merge simple
              if(typeof base.name==='string')base.name={en:base.name,fr:base.name};
              if(typeof add.name==='string')add.name={en:add.name,fr:add.name};
              base.capabilities=Array.from(new Set([...(base.capabilities||[]),...(add.capabilities||[])]));
              const A=(x)=>Array.isArray(x)?x:(x?[x]:[]);
              base.zigbee=base.zigbee||{};add.zigbee=add.zigbee||{};
              base.zigbee.manufacturerName=Array.from(new Set([...(A(base.zigbee.manufacturerName)),...(A(add.zigbee.manufacturerName||add.manufacturerName))].filter(Boolean)));
              base.zigbee.modelId=Array.from(new Set([...(A(base.zigbee.modelId)),...(A(add.zigbee.modelId||add.modelId||add.productId))].filter(Boolean)));
              const target=parentCompose||path.join(parent,'driver.compose.json');
              fs.writeFileSync(target,JSON.stringify(base,null,2));
              merged.push(target);
            }
          }
          // supprimer variants/
          try{fs.rmSync(p,{recursive:true,force:true});}catch{}
        } else { st.push(p); }
      }}
    }
  }
  if(merged.length)console.log(`[mega] flattened variants into ${merged.length} parent driver(s)`);
}
(function(){
  process.env.CI='1';process.env.NODE_ENV=process.env.NODE_ENV||'production';
  log('consignes: NO variants, direct merge into drivers'); flattenVariants();

  log('fixpkg'); if(!tryRun('node',['scripts/fix-package.js']))process.exit(1);
  log('ingest'); tryRun('node',['scripts/ingest-tuya-zips.js']);
  log('enrich --apply (direct-merge)'); tryRun('node',['scripts/enrich-drivers.js','--apply']);
  log('verify drivers'); tryRun('node',['scripts/verify-coherence-and-enrich.js']);
  log('assets'); tryRun('node',['scripts/assets-generate.js']);
  log('reindex'); tryRun('node',['scripts/reindex-drivers.js']);
  log('npm clean install'); tryRun('node',['-e',"try{require('fs').rmSync('node_modules',{recursive:true,force:true})}catch{}"]); tryRun('node',['-e',"try{require('fs').rmSync('package-lock.json',{force:true})}catch{}"]); if(!tryRun('npm',['ci']))tryRun('npm',['install','--no-fund','--no-audit']);
  log('prod deps check'); tryRun('npm',['ls','--only=prod']);
  log('update README'); tryRun('node',['scripts/update-readme.js']);
  log('validate'); tryRun('npx',['homey','app','validate']);
  log('run'); const dockerOK=tryRun('docker',['version']); const hasToken=!!(process.env.HOMEY_TOKEN||process.env.HOMEY_ACCESS_TOKEN); if(dockerOK)tryRun('npx',['homey','app','run']); else if(hasToken)tryRun('npx',['homey','app','run','--remote']); else console.log('[mega] skip run (no docker, no token)');
  log('cleanup tmp'); tryRun('node',['-e',"try{require('fs').rmSync('.tmp_tuya_zip_work',{recursive:true,force:true})}catch{}"]);
  log('git add/commit/push'); const user=process.env.GIT_USER||'Local Dev'; const email=process.env.GIT_EMAIL||'dev@localhost';
  tryRun('git',['config','--local','user.name',user]); tryRun('git',['config','--local','user.email',email]); tryRun('git',['add','-A']); tryRun('git',['commit','-m','build: merge drivers (no variants) + verify/enrich + assets + docs\nbuild: fusion drivers (sans variants) + vérif/enrich + assets + docs']); const br=spawnSync('git',['rev-parse','--abbrev-ref','HEAD'],{encoding:'utf8'}); const branch=(br.stdout||'').trim()||'master'; if(!tryRun('git',['push']))tryRun('git',['push','-u','origin',branch]);
  log('done');
})();
