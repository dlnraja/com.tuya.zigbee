@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git pull --rebase origin stable-v5
mkdir lib\security 2>nul
mkdir config\security 2>nul
mkdir tools\ci 2>nul
mkdir test\critical 2>nul
copy /Y C:\Users\Dell\Documents\homey\master\lib\security\UntrustedContentGuard.js lib\security\UntrustedContentGuard.js
copy /Y C:\Users\Dell\Documents\homey\master\config\security\untrusted-content-ssot.json config\security\untrusted-content-ssot.json
copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\untrusted-content-sanitize.js tools\ci\untrusted-content-sanitize.js
copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\p2527-untrusted-content-gate.js tools\ci\p2527-untrusted-content-gate.js
copy /Y C:\Users\Dell\Documents\homey\master\test\critical\p2527-untrusted-content-guard.test.js test\critical\p2527-untrusted-content-guard.test.js
copy /Y C:\Users\Dell\Documents\homey\master\tools\ci\forum-silent-multi-scan.js tools\ci\forum-silent-multi-scan.js
if exist lib\security\index.js copy /Y C:\Users\Dell\Documents\homey\master\lib\security\index.js lib\security\index.js
if exist lib\scraper\smart-fetch.js copy /Y C:\Users\Dell\Documents\homey\master\lib\scraper\smart-fetch.js lib\scraper\smart-fetch.js
if exist .github\scripts\privacy-redactor.js copy /Y C:\Users\Dell\Documents\homey\master\.github\scripts\privacy-redactor.js .github\scripts\privacy-redactor.js
if exist .github\workflows\forum-poll.yml copy /Y C:\Users\Dell\Documents\homey\master\.github\workflows\forum-poll.yml .github\workflows\forum-poll.yml
node reports\_bump_p2527.js
npm run check:p2527
if errorlevel 1 exit /b 1
git add lib/security/UntrustedContentGuard.js lib/security/index.js config/security/untrusted-content-ssot.json tools/ci/untrusted-content-sanitize.js tools/ci/p2527-untrusted-content-gate.js tools/ci/forum-silent-multi-scan.js test/critical/p2527-untrusted-content-guard.test.js lib/scraper/smart-fetch.js .github/scripts/privacy-redactor.js .github/workflows/forum-poll.yml package.json .homeycompose/app.json app.json .homeychangelog.json
git commit -m "feat(P2527): untrusted forum/scrape prompt-injection guard tip 5.12.202"
if errorlevel 1 exit /b 1
git push origin stable-v5
