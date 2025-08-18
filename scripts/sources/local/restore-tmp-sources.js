#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'),path=require('path');const ROOT=process.cwd();
const TMP=path.join(ROOT,'.tmp_tuya_zip_work'); const BAK=path.join(ROOT,'.backup','zips');
(function(){
  fs.mkdirSync(TMP,{recursive:true});
  if(!fs.existsSync(BAK)){console.log('[restore] no .backup/zips'); return;}
  const zips=fs.readdirSync(BAK).filter(f=>/\.zip$/i.test(f));
  let copied=0; for(const z of zips){const src=path.join(BAK,z), dst=path.join(TMP,z); if(!fs.existsSync(dst)) { fs.copyFileSync(src,dst); copied++; } }
  console.log(`[restore] copied ${copied} zip(s) to .tmp_tuya_zip_work`);
})();