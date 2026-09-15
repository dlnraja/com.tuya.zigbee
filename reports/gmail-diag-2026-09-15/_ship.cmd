@echo off
cd /d C:\Users\Dell\Documents\homey\master
git add package.json app.json .homeycompose/app.json .homeychangelog.json data/user-misattribution-registry.json scripts/data/current-fps.json config/architecture/dual-app-tracks.json test/critical/p2503-gh533-5slehgeo-curtain.test.js reports/gmail-diag-2026-09-15 reports/forum-l99-2026-09-14-t140352/NEED_ACTION.md reports/forum-l99-2026-09-14-t140352/LAST_PAGE.json reports/forum-l99-2026-09-14-t140352/FLEET_L99.md reports/forum-l99-2026-09-14-t140352/LINKS.json reports/forum-l99-2026-09-14-t140352/IMAGES.json
git commit -F .git\COMMIT_MSG_P2503
if errorlevel 1 exit /b 1
git pull --rebase origin master
if errorlevel 1 exit /b 1
git push origin master
echo EXIT=%ERRORLEVEL%
exit /b %ERRORLEVEL%
