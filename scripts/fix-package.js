'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
const PKG=path.join(process.cwd(),'package.json');
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}function save(p,o){fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n');}
function repoUses(mods){const patterns=['**/*.js','**/*.ts','**/*.mjs']; const rx=new RegExp(mods.map(m=>`(['"])${m}\\1`).join('|'));
  const files=patterns.flatMap(p=>glob.sync(p,{ignore:['node_modules/**','dist/**','.homeybuild/**','.git/**']}));
  return files.some(f=>{try{return rx.test(fs.readFileSync(f,'utf8'));}catch{return false;}});
}
(function(){
  if(!fs.existsSync(PKG)){console.error('[fixpkg] package.json not found');process.exit(1);}
  const before=load(PKG);const pkg=JSON.parse(JSON.stringify(before));
  pkg.dependencies=pkg.dependencies||{};pkg.devDependencies=pkg.devDependencies||{};pkg.scripts=pkg.scripts||{};

  // "homey" → devDependencies
  if(pkg.dependencies.homey){pkg.devDependencies.homey=pkg.dependencies.homey;delete pkg.dependencies.homey;}
  if(!pkg.devDependencies.homey) pkg.devDependencies.homey='^2';

  const DO_MIGRATE = /^1|true|yes$/i.test(String(process.env.DO_MIGRATE||'1'));
  const usesZigbeeDriver = repoUses(['homey-zigbeedriver']);
  const usesMeshDriver   = repoUses(['homey-meshdriver']);

  if (usesZigbeeDriver || DO_MIGRATE) {
    pkg.dependencies['homey-zigbeedriver'] = pkg.dependencies['homey-zigbeedriver']||'^2.0.0';
    pkg.dependencies['zigbee-clusters']    = pkg.dependencies['zigbee-clusters']   ||'^2.0.0';
    if (pkg.dependencies['homey-meshdriver']) delete pkg.dependencies['homey-meshdriver'];
  } else if (usesMeshDriver) {
    pkg.dependencies['homey-meshdriver'] = pkg.dependencies['homey-meshdriver']||'^2.0.0';
    if (repoUses(['zigbee-clusters'])) pkg.dependencies['zigbee-clusters'] = pkg.dependencies['zigbee-clusters']||'^2.0.0';
  } else {
    pkg.dependencies['homey-zigbeedriver'] = pkg.dependencies['homey-zigbeedriver']||'^2.0.0';
    pkg.dependencies['zigbee-clusters']    = pkg.dependencies['zigbee-clusters']   ||'^2.0.0';
  }

  // libs dev → devDependencies
  for (const t of ['chai','sinon','chalk','commander','inquirer','eslint','prettier','mocha','nyc']) {
    if (pkg.dependencies[t]) { pkg.devDependencies[t]=pkg.dependencies[t]; delete pkg.dependencies[t]; }
  }

  // scripts
  pkg.scripts.run     = pkg.scripts.run     || 'homey app run';
  pkg.scripts.remote  = pkg.scripts.remote  || 'homey app run --remote';
  pkg.scripts.ingest  = pkg.scripts.ingest  || 'node scripts/ingest-tuya-zips.js';
  pkg.scripts.enrich  = pkg.scripts.enrich  || 'node scripts/enrich-drivers.js --apply';
  pkg.scripts.reorg   = pkg.scripts.reorg   || 'node scripts/reorganize-drivers.js';
  pkg.scripts.verify  = pkg.scripts.verify  || 'node scripts/verify-coherence-and-enrich.js';
  pkg.scripts.assets  = pkg.scripts.assets  || 'node scripts/assets-generate.js';
  pkg.scripts.reindex = pkg.scripts.reindex || 'node scripts/reindex-drivers.js';
  pkg.scripts.readme  = pkg.scripts.readme  || 'node scripts/update-readme.js';
  pkg.scripts.migrate = pkg.scripts.migrate || 'node scripts/migrate-meshdriver-to-zigbeedriver.js';
  pkg.scripts.normbak = pkg.scripts.normbak || 'node scripts/normalize-backup.js';
  pkg.scripts.mega    = pkg.scripts.mega    || 'node scripts/mega-verify-enrich.js';

  if (pkg.private !== true) pkg.private = true;

  if (JSON.stringify(pkg)!==JSON.stringify(before)) { save(PKG,pkg); console.log('[fixpkg] package.json updated.'); }
  else { console.log('[fixpkg] package.json already OK.'); }
})();
