#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const base='drivers'; if(!fs.existsSync(base)){console.log('ℹ️ drivers/ missing');process.exit(0);}
const rows=[]; for(const d of fs.readdirSync(base,{withFileTypes:true})){
 if(!d.isDirectory())continue; const id=d.name,root=path.join(base,id);
 rows.push({driver:id,has_driver_js:fs.existsSync(path.join(root,'driver.js')),
  has_device_js:fs.existsSync(path.join(root,'device.js')),
  has_compose:fs.existsSync(path.join(root,'driver.compose.json'))||fs.existsSync(path.join(root,'driver.json')),
  has_pair:fs.existsSync(path.join(root,'pair'))});}
console.table(rows);
const md=rows.filter(r=>!r.has_device_js).length, dr=rows.filter(r=>!r.has_driver_js).length;
if(md||dr){console.error(`⚠️ missing device.js:${md}, driver.js:${dr}`);process.exit(2);}console.log('✅ drivers OK');
