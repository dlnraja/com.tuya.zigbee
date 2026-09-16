@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add drivers/switch_2gang/driver.compose.json test/critical/p2533-complementary-merge-helpers.test.js lib/enrichment/ComplementaryMerge.js package.json app.json .homeycompose/app.json .homeychangelog.json data/mfs_db.json
git status -sb
git commit -m "test(P2533): Contre quoi merge helpers + nkjintbl strip + mfs tip 5.12.212"
if errorlevel 1 exit /b 1
git pull --rebase origin stable-v5
git push origin stable-v5
git log -1 --oneline
