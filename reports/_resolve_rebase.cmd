@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git checkout --theirs app.json
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('app.json','utf8')); j.version='5.12.195'; fs.writeFileSync('app.json', JSON.stringify(j)); console.log('app', j.version);"
git add app.json
git -c core.editor=true rebase --continue
git push origin stable-v5
echo FINAL=%ERRORLEVEL%
git log -1 --oneline
git status -sb
