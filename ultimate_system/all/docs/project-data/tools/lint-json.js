#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
function* walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory()){ if(['node_modules','.git','dist','build'].includes(e.name))continue; yield* walk(p); }
 else if(e.isFile()&&p.endsWith('.json')) yield p;}}
let errors=0; for(const f of walk(process.cwd())){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){console.error('❌ JSON',f,e.message);errors++;}}
if(errors){console.error('✋ Invalid JSON files =',errors);process.exit(1);}console.log('✅ JSON OK');
