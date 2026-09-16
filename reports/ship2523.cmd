@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git rebase --abort
git fetch origin stable-v5
git reset --hard origin/stable-v5
copy /Y C:\Users\Dell\Documents\homey\master\lib\pairing\UserMisattributionRegistry.js lib\pairing\UserMisattributionRegistry.js
copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\strip-registry-forbidden-compose.js tools\ci\strip-registry-forbidden-compose.js
copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\p2519-anti-regression-enrich-gate.js tools\ci\p2519-anti-regression-enrich-gate.js
if exist tools\ci\fleet-intelligent-enrich.js copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\fleet-intelligent-enrich.js tools\ci\fleet-intelligent-enrich.js
if exist tools\ci\sync-compose-to-mfs-db.js copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\sync-compose-to-mfs-db.js tools\ci\sync-compose-to-mfs-db.js
copy /Y C:\Users\Dell\Documents\homey\master\test\critical\p2523-fleet-forbidden-strip.test.js test\critical\p2523-fleet-forbidden-strip.test.js
node tools\ci\strip-registry-forbidden-compose.js --apply
node -e "const fs=require('fs'); const v='5.12.197'; for (const f of ['package.json','.homeycompose/app.json','app.json']) { if(!fs.existsSync(f)) continue; const j=JSON.parse(fs.readFileSync(f,'utf8')); j.version=v; if(f==='package.json'){ j.scripts=j.scripts||{}; j.scripts['check:p2523']='node --test test/critical/p2523-fleet-forbidden-strip.test.js'; } fs.writeFileSync(f, f==='app.json'?JSON.stringify(j):JSON.stringify(j,null,2)+'\n'); } const cl=JSON.parse(fs.readFileSync('.homeychangelog.json','utf8')); cl['5.12.197']={en:'L99: strip doNotLock invent climate bleed; harden forbidden placement. Update Stable Test.'}; fs.writeFileSync('.homeychangelog.json', JSON.stringify(cl,null,2)+'\n'); console.log(v);"
git add lib/pairing/UserMisattributionRegistry.js tools/ci/strip-registry-forbidden-compose.js tools/ci/p2519-anti-regression-enrich-gate.js tools/ci/fleet-intelligent-enrich.js tools/ci/sync-compose-to-mfs-db.js test/critical/p2523-fleet-forbidden-strip.test.js package.json .homeycompose/app.json app.json .homeychangelog.json data/mfs_db.json drivers/climate_sensor/driver.compose.json
git commit -m "fix(P2523): L99 Fleet strip doNotLock invent bleed tip 5.12.197"
git push origin stable-v5
git log -1 --oneline
git status -sb
