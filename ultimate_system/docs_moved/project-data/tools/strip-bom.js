#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
function* walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory()){ if(['node_modules','.git','dist','build'].includes(e.name))continue; yield* walk(p); }
 else if(e.isFile()&&p.endsWith('.json')) yield p;}}
let fixed=0; for(const f of walk(process.cwd())){const b=fs.readFileSync(f);
 if(b.length>=3 && b[0]===0xEF && b[1]===0xBB && b[2]===0xBF){fs.writeFileSync(f,b.slice(3)); console.log('✂️  BOM',f); fixed++;}}
console.log('✅ Fixed:',fixed);
