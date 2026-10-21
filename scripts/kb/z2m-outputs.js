'use strict';const fs=require('fs'),path=require('path');const KB=process.env.KB_DIR||'/workspace/kb';
const idx=JSON.parse(fs.readFileSync(KB+'/index/z2m/entries.json'));fs.writeFileSync(KB+'/z2m/devices.json',JSON.stringify(idx));
const urls=new Set(fs.readFileSync(KB+'/z2m-sitemap.txt','utf8').split('\n').filter(Boolean));urls.add('https://www.zigbee2mqtt.io/guide/configuration/devices-groups.html#generic-device-options');
const walk=(d,o=[])=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?walk(p,o):/\.md$/.test(f)&&o.push(p);}return o;};
const root=KB+'/z2m-site/docs';let md=`# Zigbee2MQTT guide index\nSource: ${idx.cite.repo} @ ${idx.cite.commit} (${idx.cite.date}), GPL-3.0. Outline only (titles/sections); no prose copied.\n\n`;
for(const f of [...walk(root+'/guide'),...walk(root+'/advanced')].sort()){const t=fs.readFileSync(f,'utf8');const rel=path.relative(root,f).replace(/README\.md$/,'').replace(/\.md$/,'.html');const u='https://www.zigbee2mqtt.io/'+rel;urls.add(u);
 const h1=(t.match(/^#\s+(.*)$/m)||[])[1]||rel;const hs=[...t.matchAll(/^##+\s+(.*)$/gm)].map(m=>m[1]).slice(0,15);
 const opts=[...new Set([...t.matchAll(/^\s*[#]?\s*([a-z_]{3,}):/gm)].map(m=>m[1]))].slice(0,20);
 md+=`## ${h1}\n- URL: ${u}\n- Covers: ${hs.join('; ')||'(single section)'}\n${opts.length?'- Config keys mentioned: `'+opts.join('`, `')+'`\n':''}\n`;}
fs.writeFileSync(KB+'/z2m/guide-index.md',md);fs.writeFileSync(KB+'/z2m/urls.txt',[...urls].sort().join('\n')+'\n');console.log(idx.entries.length,urls.size);
