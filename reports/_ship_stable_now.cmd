@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add lib/protocol/IntelligentProtocolRouter.js lib/devices/UnifiedPlugBase.js lib/devices/UnifiedLightBase.js lib/devices/UnifiedThermostatBase.js .github/workflows/syntax-check.yml .github/workflows/auto-fix-and-publish.yml test/critical/p214-intelligent-protocol-detect.test.js test/critical/p2521f-dual-app-syntax-bseed.test.js package.json .homeycompose/app.json app.json .homeychangelog.json
git status -sb
git commit -m "fix(P2521f): BSEED zcl_only P214 Syntax harden tip 5.12.195"
if errorlevel 1 exit /b 1
git pull --rebase origin stable-v5
git push origin stable-v5
echo STABLE=%ERRORLEVEL%
