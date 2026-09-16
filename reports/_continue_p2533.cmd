@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_resolve_p2533.js
git add app.json data/mfs_db.json package.json .homeycompose/app.json .homeychangelog.json drivers/switch_2gang/driver.compose.json test/critical/p2533-complementary-merge-helpers.test.js
set GIT_EDITOR=true
git rebase --continue
if errorlevel 1 (
  echo rebase continue failed
  exit /b 1
)
git push origin stable-v5
git log -1 --oneline
git status -sb
