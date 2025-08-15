#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');

function* walkDrivers(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Vérifier si c'est un driver (contient driver.compose.json ou driver.json)
        const hasCompose = fs.existsSync(path.join(fullPath, 'driver.compose.json'));
        const hasDriver = fs.existsSync(path.join(fullPath, 'driver.json'));
        
        if (hasCompose || hasDriver) {
          yield fullPath;
        }
        
        // TOUJOURS continuer à scanner récursivement
        yield* walkDrivers(fullPath);
      }
    }
  } catch (e) {
    // Ignorer les erreurs de lecture
  }
}

const rows=[], base='drivers'; 
if(fs.existsSync(base)){ 
  for(const driverPath of walkDrivers(base)){
    const id = path.relative(base, driverPath).replace(/\\/g, '/');
    const metaPath=['driver.compose.json','driver.json'].map(f=>path.join(driverPath,f)).find(f=>fs.existsSync(f));
    
    let meta={},err=null; 
    if(metaPath){ 
      try{ 
        meta=JSON.parse(fs.readFileSync(metaPath,'utf8')); 
      }catch(e){
        err=String(e);
      } 
    }
    
    const zb=meta&&meta.zigbee||{}, 
          list=v=>Array.isArray(v)?v[0]: (typeof v==='string'?v:null);
    
    rows.push({ 
      driver_id:id,
      title: typeof meta.name==='object'?(meta.name.en||meta.name.fr||Object.values(meta.name)[0]):(meta.name||meta.title||meta.id||null),
      class: meta.class||null,
      capabilities: Array.isArray(meta.capabilities)? meta.capabilities.join(','): null,
      manufacturerName: list(zb.manufacturerName),
      modelId: list(zb.modelId||zb.modelID),
      productId: list(zb.productId||zb.productID),
      has_driver_js: fs.existsSync(path.join(driverPath,'driver.js')),
      has_device_js: fs.existsSync(path.join(driverPath,'device.js')),
      has_pair: fs.existsSync(path.join(driverPath,'pair')),
      meta_file: metaPath||null, 
      parse_error: err 
    });
  }
}

fs.mkdirSync('matrices',{recursive:true});
fs.writeFileSync('matrices/driver_matrix.json', JSON.stringify(rows,null,2));

const header=Object.keys(rows[0]||{}),
      csv=[header.join(','),...rows.map(r=>header.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');
fs.writeFileSync('matrices/driver_matrix.csv',csv);

const mdHead='| '+header.join(' | ')+' |', 
      mdSep='| '+header.map(()=> '---').join(' | ')+' |';
const mdRows=rows.slice(0,200).map(r=>'| '+header.map(k=>String(r[k]??'')).join(' | ')+' |');
fs.writeFileSync('matrices/driver_matrix.md',['# Driver Matrix (preview: 200 rows)','',mdHead,mdSep,...mdRows].join('\n'));

console.log('✅ matrices generated');
