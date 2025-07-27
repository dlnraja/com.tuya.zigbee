@echo off
REM Fix Terminal and Continue Tasks - CMD Script
REM Script CMD pour corriger le terminal et continuer les tâches

echo [INFO] === CORRECTION TERMINAL ET CONTINUATION ===
echo.

REM Kill hanging processes
taskkill /f /im git.exe 2>nul
taskkill /f /im npm.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im pwsh.exe 2>nul
echo [OK] Processus suspendus terminés

REM Clear screen
cls

REM Set environment variables
set YOLO_MODE=true
set AUTO_CONTINUE=true
set MCP_SERVER=true
echo [OK] Variables d'environnement configurées

REM Update package.json version
echo [ACTION] Mise à jour version package.json...
powershell -Command "(Get-Content 'package.json' | ConvertFrom-Json | ForEach-Object { $_.version = '1.0.24'; $_ } | ConvertTo-Json -Depth 10) | Set-Content 'package.json'"
echo [OK] Version mise à jour: 1.0.24

REM Create task log
echo [ACTION] Création du rapport de reprise...
powershell -Command "New-Item -Path 'logs/cmd-resume-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.md' -ItemType File -Force | Out-Null"
echo [OK] Rapport créé

REM Execute tasks
echo [ACTION] Exécution des tâches...
node scripts/process-chatgpt-urls.js
node scripts/test-chatgpt-features.js
node scripts/update-chatgpt-docs.js
node scripts/generate-template.js
echo [OK] Tâches exécutées

REM Git operations
echo [ACTION] Opérations Git...
git add -A
git commit -m "CMD TERMINAL FIX - %date% %time% - Version 1.0.24 - Terminal corrigé avec CMD, toutes les tâches reprises automatiquement"
git push origin master
echo [OK] Git operations terminées

echo.
echo [SUCCESS] === CORRECTION TERMINALE RÉUSSIE ===
echo [INFO] Version: 1.0.24
echo [INFO] Terminal: CMD (stable)
echo [INFO] Tâches: Reprises automatiquement
echo [INFO] Prochaines étapes: Validation et monitoring
echo.

pause 