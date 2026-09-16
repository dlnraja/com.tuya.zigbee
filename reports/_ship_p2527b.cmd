@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add lib/security/UntrustedContentGuard.js lib/security/index.js config/security/untrusted-content-ssot.json tools/ci/untrusted-content-sanitize.js tools/ci/p2527-untrusted-content-gate.js tools/ci/forum-silent-multi-scan.js test/critical/p2527-untrusted-content-guard.test.js lib/scraper/smart-fetch.js .github/scripts/privacy-redactor.js .github/workflows/forum-poll.yml package.json .homeycompose/app.json app.json .homeychangelog.json
git commit -m "feat(P2527): untrusted forum/scrape prompt-injection guard tip 5.12.202"
echo COMMIT_EXIT=%ERRORLEVEL%
if errorlevel 1 exit /b 1
git push origin stable-v5
echo PUSH_EXIT=%ERRORLEVEL%
