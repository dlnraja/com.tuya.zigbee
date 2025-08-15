#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const src='matrices/driver_matrix.json'; if(!fs.existsSync(src)){console.error('matrix missing');process.exit(1);}
const rows=JSON.parse(fs.readFileSync(src,'utf8'));
const Q=r=>[r.manufacturerName,r.modelId,r.productId,r.title,r.driver_id].filter(Boolean).join(' ');
const out=rows.map(r=>({driver_id:r.driver_id,
  zigbee2mqtt_query:`site:zigbee2mqtt.io "${Q(r)}"`,
  blakadder_query:`site:blakadder.com/zigbee "${Q(r)}"`,
  homey_forum_query:`site:community.homey.app "${Q(r)}"`,
  github_query:`site:github.com zigbee "${Q(r)}"`}));
fs.mkdirSync('references',{recursive:true});
fs.writeFileSync('references/driver_search_queries.json',JSON.stringify(out,null,2));
const header=Object.keys(out[0]||{}),
csv=[header.join(','),...out.map(r=>header.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');
fs.writeFileSync('references/driver_search_queries.csv',csv);
fs.writeFileSync('references/driver_search_queries.md',
 ['# Driver Search Queries','','',...out.map(r=>`## ${r.driver_id}
- Zigbee2MQTT: \`${r.zigbee2mqtt_query}\`
- Blakadder: \`${r.blakadder_query}\`
- Homey forum: \`${r.homey_forum_query}\`
- GitHub: \`${r.github_query}\`
`)].join('\n'));
console.log('✅ references generated');
