@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  MASTER ORCHESTRATOR ULTIMATE - LANCEUR WINDOWS
REM  Double-cliquez pour lancer le script ultime!
REM ═══════════════════════════════════════════════════════════════════

title Master Orchestrator Ultimate - Homey App Automation

color 0B
echo.
echo ═══════════════════════════════════════════════════════════════════
echo  🎭 MASTER ORCHESTRATOR ULTIMATE v3.0
echo     Le script ultime qui fait TOUT!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  Ce script va executer automatiquement:
echo.
echo    ✓ Verification des problemes forum
echo    ✓ Telechargement databases externes (Blakadder, Zigbee2MQTT)
echo    ✓ Matching intelligent avec sources externes
echo    ✓ Conversion cross-platform
echo    ✓ Enrichissement automatique des drivers
echo    ✓ Validation multi-niveaux
echo    ✓ Organisation de la documentation
echo    ✓ Commit et push vers GitHub
echo    ✓ Publication automatique (GitHub Actions)
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Menu de sélection
echo  MODE D'EXECUTION:
echo.
echo  [1] NORMAL      - Execute tout, enrichit et publie
echo  [2] DRY RUN     - Simulation sans modification
echo  [3] FORUM ONLY  - Check forum issues uniquement
echo  [4] ENRICH ONLY - Enrichissement sans publication
echo  [5] NO PUBLISH  - Enrichit mais ne publie pas
echo  [6] ANNULER
echo.

set /p choice="Choisissez une option (1-6): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Mode NORMAL selectionne
    echo.
    node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js
) else if "%choice%"=="2" (
    echo.
    echo 🔍 Mode DRY RUN selectionne
    echo.
    node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --dry-run
) else if "%choice%"=="3" (
    echo.
    echo 💬 Mode FORUM ONLY selectionne
    echo.
    node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --forum-only
) else if "%choice%"=="4" (
    echo.
    echo 🤖 Mode ENRICH ONLY selectionne
    echo.
    node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --enrich-only --no-publish
) else if "%choice%"=="5" (
    echo.
    echo 📝 Mode NO PUBLISH selectionne
    echo.
    node scripts\MASTER_ORCHESTRATOR_ULTIMATE.js --no-publish
) else if "%choice%"=="6" (
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
echo  ✅ EXECUTION TERMINEE!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  📊 Consultez le rapport complet dans:
echo     docs\orchestration\master_orchestrator_*.json
echo.

:end
echo.
echo  Appuyez sur une touche pour fermer...
pause >nul
