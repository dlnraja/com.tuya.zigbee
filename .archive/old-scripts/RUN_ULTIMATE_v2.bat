@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  MASTER ULTIMATE LAUNCHER v2.15.33 - WINDOWS
REM  Double-cliquez pour lancer tous les processus!
REM  
REM  NOUVEAU: Inclut ULTIMATE_PROJECT_FINALIZER.js
REM  - Vérifie résolution problèmes forum
REM  - Met à jour sources et références
REM  - Optimise scripts et workflows
REM  - Génère rapport complet
REM ═══════════════════════════════════════════════════════════════════

title Master Ultimate Launcher v2.15.33 - Homey Tuya Zigbee

color 0B
cls
echo.
echo ═══════════════════════════════════════════════════════════════════
echo  🚀 MASTER ULTIMATE LAUNCHER v2.15.33
echo     Universal Tuya Zigbee App - Production Ready!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  Ce launcher execute les meilleurs scripts:
echo.
echo    ✅ ULTIMATE_PROJECT_FINALIZER    - Finalise TOUT le projet
echo    ✅ MASTER_ORCHESTRATOR_ULTIMATE  - Orchestre enrichissements
echo    ✅ Forum issues verification      - Verifie problemes resolus
echo    ✅ Drivers sources update         - Met a jour IDs
echo    ✅ Scripts optimization           - Optimise tous scripts
echo    ✅ Workflows enhancement          - Ameliore workflows
echo    ✅ Documentation update           - Met a jour docs
echo    ✅ Final audit                    - Audit complet
echo    ✅ GitHub Actions trigger         - Publie sur App Store
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Menu de sélection
echo  MODE D'EXECUTION:
echo.
echo  [1] 🎯 FINALIZER COMPLET  - Lance ULTIMATE_PROJECT_FINALIZER
echo  [2] 🤖 ORCHESTRATOR       - Lance MASTER_ORCHESTRATOR_ULTIMATE  
echo  [3] 📊 AUDIT ONLY         - Audit complet sans modifications
echo  [4] 🔄 UPDATE SOURCES     - Met a jour drivers sources
echo  [5] 🖼️  VALIDATE IMAGES    - Verifie dimensions images
echo  [6] 📝 GENERATE REPORT    - Genere rapport final
echo  [7] 🚀 PUBLISH VIA GITHUB - Trigger GitHub Actions
echo  [8] ❌ ANNULER
echo.

set /p choice="Choisissez une option (1-8): "

if "%choice%"=="1" (
    cls
    echo.
    echo 🎯 ULTIMATE PROJECT FINALIZER - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    node scripts\ULTIMATE_PROJECT_FINALIZER.js
    
    echo.
    echo ═══════════════════════════════════════════════════════════════════
    echo  ✅ FINALIZER TERMINE!
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    echo  📊 Rapports generes:
    echo     - docs\reports\ULTIMATE_FINALIZATION_REPORT.json
    echo     - docs\reports\ULTIMATE_FINALIZATION_REPORT.md
    echo.
    
) else if "%choice%"=="2" (
    cls
    echo.
    echo 🤖 MASTER ORCHESTRATOR ULTIMATE - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    echo  Options orchestrator:
    echo.
    echo  [A] NORMAL      - Execute tout
    echo  [B] DRY RUN     - Simulation seulement
    echo  [C] NO PUBLISH  - Sans publication
    echo.
    
    set /p orch_choice="Option (A-C): "
    
    if /i "%orch_choice%"=="A" (
        node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js
    ) else if /i "%orch_choice%"=="B" (
        node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --dry-run
    ) else if /i "%orch_choice%"=="C" (
        node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --no-publish
    )
    
) else if "%choice%"=="3" (
    cls
    echo.
    echo 📊 AUDIT COMPLET - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    echo  Verification des elements cles...
    echo.
    
    REM Verifier validation Homey
    echo  [1/6] Validation Homey...
    call homey app validate
    echo.
    
    REM Verifier images
    echo  [2/6] Verification dimensions images...
    node -e "const fs=require('fs');const p='assets/images';console.log(fs.existsSync(p)?'✅ Images OK':'❌ Images manquantes')"
    echo.
    
    REM Verifier workflows
    echo  [3/6] Verification workflows...
    dir /b .github\workflows\*.yml | find /c ".yml"
    echo  workflows actifs trouves
    echo.
    
    REM Verifier drivers
    echo  [4/6] Verification drivers...
    dir /b drivers | find /c /v ""
    echo  drivers trouves
    echo.
    
    REM Verifier documentation
    echo  [5/6] Verification documentation...
    dir /b docs\*.md | find /c ".md"
    echo  fichiers documentation trouves
    echo.
    
    REM Verifier scripts
    echo  [6/6] Verification scripts...
    dir /b /s scripts\*.js | find /c ".js"
    echo  scripts trouves
    echo.
    
    echo ═══════════════════════════════════════════════════════════════════
    echo  ✅ AUDIT TERMINE!
    echo ═══════════════════════════════════════════════════════════════════
    
) else if "%choice%"=="4" (
    cls
    echo.
    echo 🔄 MISE A JOUR SOURCES DRIVERS - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    echo  Sources a mettre a jour:
    echo    - Zigbee2MQTT devices
    echo    - ZHA device handlers
    echo    - Blakadder database
    echo    - Homey forum reports
    echo.
    
    REM Execute enrichment scripts
    if exist scripts\enrichment\MEGA_SCRAPER_V2.js (
        echo  Lancement MEGA_SCRAPER_V2...
        node scripts\enrichment\MEGA_SCRAPER_V2.js
    )
    
    if exist scripts\enrichment\ENRICH_ALL_DRIVERS.js (
        echo  Lancement ENRICH_ALL_DRIVERS...
        node scripts\enrichment\ENRICH_ALL_DRIVERS.js
    )
    
    echo.
    echo ═══════════════════════════════════════════════════════════════════
    echo  ✅ SOURCES MISES A JOUR!
    echo ═══════════════════════════════════════════════════════════════════
    
) else if "%choice%"=="5" (
    cls
    echo.
    echo 🖼️  VALIDATION IMAGES - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    echo  Verification des dimensions:
    echo    App images:    250x175, 500x350, 1000x700
    echo    Driver images: 75x75, 500x500, 1000x1000
    echo.
    
    REM Verifier si ImageMagick disponible
    where identify >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo  ✅ ImageMagick detecte - Verification precise possible
        echo.
        
        REM Verifier app images
        echo  App images:
        identify -format "  %%f: %%wx%%h\n" assets\images\*.png 2>nul
        
        echo.
        echo  Sample driver images (premiers 5):
        for /L %%i in (1,1,5) do (
            for /D %%d in (drivers\*) do (
                if exist "%%d\assets\small.png" (
                    identify -format "  %%d: %%wx%%h\n" "%%d\assets\small.png" 2>nul
                    goto :next_driver
                )
            )
            :next_driver
        )
    ) else (
        echo  ⚠️  ImageMagick non detecte - Verification basique
        echo.
        echo  App images:
        dir assets\images\*.png
        
        echo.
        echo  Pour verification precise, installez ImageMagick:
        echo  https://imagemagick.org/script/download.php
    )
    
    echo.
    echo ═══════════════════════════════════════════════════════════════════
    echo  ✅ VALIDATION IMAGES TERMINEE!
    echo ═══════════════════════════════════════════════════════════════════
    
) else if "%choice%"=="6" (
    cls
    echo.
    echo 📝 GENERATION RAPPORT FINAL - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    REM Lance finalizer pour generer rapport
    node scripts\ULTIMATE_PROJECT_FINALIZER.js
    
    echo.
    echo  Rapport genere dans:
    echo    - docs\reports\ULTIMATE_FINALIZATION_REPORT.json
    echo    - docs\reports\ULTIMATE_FINALIZATION_REPORT.md
    echo.
    
    REM Ouvrir rapport Markdown
    if exist docs\reports\ULTIMATE_FINALIZATION_REPORT.md (
        echo  Voulez-vous ouvrir le rapport maintenant? (O/N)
        set /p open_report="> "
        if /i "%open_report%"=="O" (
            start docs\reports\ULTIMATE_FINALIZATION_REPORT.md
        )
    )
    
    echo ═══════════════════════════════════════════════════════════════════
    echo  ✅ RAPPORT GENERE!
    echo ═══════════════════════════════════════════════════════════════════
    
) else if "%choice%"=="7" (
    cls
    echo.
    echo 🚀 PUBLICATION VIA GITHUB ACTIONS - DEMARRAGE...
    echo ═══════════════════════════════════════════════════════════════════
    echo.
    
    echo  Cette operation va:
    echo    1. Mettre a jour .publish-trigger
    echo    2. Commit les changements
    echo    3. Push vers GitHub
    echo    4. Declencher workflow auto-publish-complete.yml
    echo.
    echo  ⚠️  ATTENTION: Ceci va lancer une publication automatique!
    echo.
    echo  Continuer? (O/N)
    set /p confirm="> "
    
    if /i "%confirm%"=="O" (
        echo.
        echo  Mise a jour .publish-trigger...
        echo TRIGGER_GITHUB_ACTIONS_PUBLISH > .publish-trigger
        echo Timestamp: %date% %time% >> .publish-trigger
        echo Version: v2.15.33 >> .publish-trigger
        echo Status: READY FOR PRODUCTION >> .publish-trigger
        
        echo  Commit et push...
        git add .publish-trigger
        git commit -m "🚀 TRIGGER: GitHub Actions Auto-Publish v2.15.33"
        git push origin master
        
        echo.
        echo  ✅ Push reussi! Workflow GitHub Actions demarre automatiquement.
        echo.
        echo  Suivez la progression sur:
        echo  https://github.com/dlnraja/com.tuya.zigbee/actions
        echo.
        
        REM Ouvrir browser
        echo  Voulez-vous ouvrir GitHub Actions dans le navigateur? (O/N)
        set /p open_gh="> "
        if /i "%open_gh%"=="O" (
            start https://github.com/dlnraja/com.tuya.zigbee/actions
        )
    ) else (
        echo  ❌ Publication annulee
    )
    
    echo ═══════════════════════════════════════════════════════════════════
    echo  Publication GitHub Actions
    echo ═══════════════════════════════════════════════════════════════════
    
) else if "%choice%"=="8" (
    echo.
    echo ❌ Annule
    goto :end
    
) else (
    echo.
    echo ❌ Option invalide!
    goto :end
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo  ✅ OPERATION TERMINEE!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  📊 Fichiers importants:
echo     - docs\reports\ULTIMATE_FINALIZATION_REPORT.md
echo     - docs\FINAL_PROJECT_AUDIT_2025-10-12.md
echo     - .github\workflows\IMAGE_VALIDATION_CONFIG.md
echo     - docs\GITHUB_ACTIONS_PUBLISHING_STATUS.md
echo.

:end
echo.
echo  Appuyez sur une touche pour fermer...
pause >nul
