'use strict';
const fs=require('fs'),path=require('path');
const ROOT=process.cwd(),DRV=path.join(ROOT,'drivers');
const PNG_PLACEHOLDER_BASE64='iVBORw0KGgoAAAANSUhEUgAAAPoAAACvCAYAAABb6gQdAAAA'; // placeholder court

function* walk(d){
  if(!fs.existsSync(d))return;
  const st=[d];
  while(st.length){
    const c=st.pop(); let s; try {s=fs.statSync(c);}} catch (error) {continue;}
    if(s.isDirectory()){
      const es=fs.readdirSync(c);
      if(es.some(e=>/^driver(\.compose)?\.json$/i.test(e)))yield c;
      for(const e of es)st.push(path.join(c,e));
    }
  }
}

(async()=>{
  let created=0;
  for(const dir of walk(DRV)){
    const assets=path.join(dir,'assets'); 
    const png=path.join(assets,'small.png');
    if(!fs.existsSync(assets)) fs.mkdirSync(assets,{recursive:true});
    if(!fs.existsSync(png)){
      try { 
        const sharp = require('sharp'); 
        await sharp({ 
          create:{ 
            width:250,height:175,channels:4,
            background:{r:246,g:248,b:250,alpha:1} 
          } 
        }).png().toFile(png); 
      }
      } catch (error) { 
        fs.writeFileSync(png, Buffer.from(PNG_PLACEHOLDER_BASE64,'base64')); 
      }
      created++; 
      console.log('[small] created', path.relative(process.cwd(),png));
    }
  }
  console.log(created?`[small] created ${created} file(s)`:'[small] nothing to create');
})().catch(e=>{console.error('[small] fatal',e);process.exitCode=1;});
