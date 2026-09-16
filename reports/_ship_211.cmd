@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_bump_211.js
git add .homeycompose/app.json package.json app.json .homeychangelog.json
git commit -m "chore(P2532): bump tip 5.12.211 for Contre quoi test family"
git pull --rebase origin stable-v5
git push origin stable-v5
git log -1 --oneline
