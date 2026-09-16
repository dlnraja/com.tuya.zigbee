@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_bump_210.js
git add .homeycompose/app.json package.json app.json .homeychangelog.json
git commit -m "chore(P2531): bump tip 5.12.210 for complementary coverage mega"
git pull --rebase origin stable-v5
git push origin stable-v5
git log -1 --oneline
