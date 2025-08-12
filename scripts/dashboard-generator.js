'use strict';
const fs=require('fs'),path=require('path');
const ROOT=process.cwd(),IDX=path.join(ROOT,'drivers-index.json'),OUT=path.join(ROOT,'dashboard');
(function(){
  if(!fs.existsSync(IDX)){console.log('[dash] drivers-index.json missing');return;}
  const data=JSON.parse(fs.readFileSync(IDX,'utf8'));
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(data,null,2));
  const rows=data.map(d=>`<tr><td>${d.id||''}</td><td>${(d.caps||[]).join(', ')}</td><td>${d.compose}</td></tr>`).join('\n');
  const html=`<!doctype html><meta charset="utf-8"><title>Tuya/Zigbee Drivers</title>
  <style>body{font-family:system-ui,Segoe UI,Arial;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f6f8fa}</style>
  <h1>Drivers Index</h1><table><thead><tr><th>ID</th><th>Capabilities</th><th>Compose</th></tr></thead><tbody>${rows}</tbody></table>`;
  fs.writeFileSync(path.join(OUT,'index.html'),html);
  console.log('[dash] dashboard generated at dashboard/index.html');
})();