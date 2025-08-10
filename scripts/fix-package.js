'use strict';
const fs=require('fs'),path=require('path');const PKG=path.join(process.cwd(),'package.json');
function fix(){let p=JSON.parse(fs.readFileSync(PKG,'utf8'));let c=false;
if(p.dependencies?.homey){p.devDependencies=p.devDependencies||{};p.devDependencies.homey=p.dependencies.homey;delete p.dependencies.homey;c=true;}
if(p.dependencies?.['homey-meshdriver']&&process.env.DO_MIGRATE){p.dependencies['homey-zigbeedriver']=p.dependencies['homey-meshdriver'];delete p.dependencies['homey-meshdriver'];c=true;}
if(!p.scripts?.validate)p.scripts=p.scripts||{},p.scripts.validate='npx homey app validate',c=true;
if(!p.scripts?.run)p.scripts.run='npx homey app run',c=true;
if(!p.scripts?.build)p.scripts.build='npx homey app build',c=true;
if(c){fs.writeFileSync(PKG,JSON.stringify(p,null,2));console.log('[package] fixed');}else{console.log('[package] already ok');}}
fix();
