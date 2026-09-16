@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add drivers/climate_sensor/driver.compose.json lib/pairing/UserMisattributionRegistry.js tools/ci/strip-registry-forbidden-compose.js tools/ci/p2519-anti-regression-enrich-gate.js tools/ci/fleet-intelligent-enrich.js tools/ci/sync-compose-to-mfs-db.js test/critical/p2523-fleet-forbidden-strip.test.js package.json .homeycompose/app.json app.json .homeychangelog.json data/mfs_db.json
git commit -m "fix(P2523): L99 Fleet strip doNotLock invent bleed tip 5.12.197"
git pull --rebase origin stable-v5
if errorlevel 1 exit /b 1
git push origin stable-v5
git status -sb
git log -2 --oneline
