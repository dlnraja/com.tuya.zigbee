@echo off
setlocal
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_resolve_p2530d_appjson.js
if errorlevel 1 exit /b 1
git add app.json
set GIT_EDITOR=true
git -c core.editor=true rebase --continue
if errorlevel 1 (
  echo REBASE_CONTINUE_FAILED
  exit /b 1
)
git pull --rebase origin stable-v5
git push origin stable-v5
echo STABLE_DONE
git log -1 --oneline
endlocal
