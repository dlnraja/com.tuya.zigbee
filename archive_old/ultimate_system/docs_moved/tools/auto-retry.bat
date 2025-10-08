@echo off
echo 🔄 AUTO RETRY PUBLISH SYSTEM

:retry
echo 🧹 Cleaning cache...
if exist .homeycompose rmdir /s /q .homeycompose

echo 🚀 Running homey app publish...
echo n | npx homey app publish

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed, retrying...
    timeout /t 5 /nobreak
    goto retry
)

echo ✅ Success!
git add -A
git commit -m "🎉 Published successfully"
git push origin master
