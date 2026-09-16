@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_resolve_210.js
git add app.json .homeycompose/app.json package.json .homeychangelog.json
set GIT_EDITOR=true
git -c core.editor=true rebase --continue
git push origin stable-v5
git checkout stable-v5
git log -1 --oneline
echo STABLE_210_DONE
