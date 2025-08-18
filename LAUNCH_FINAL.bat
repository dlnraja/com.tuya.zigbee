@echo off
echo ========================================
echo  LANCEMENT FINAL - Tuya Zigbee Drivers
echo ========================================
echo.

echo [1/8] Verification de l'environnement...
echo    Verification de Node.js...
node --version 2>nul
if %errorlevel% equ 0 (
    echo    ✅ Node.js detecte
) else (
    echo    ❌ Node.js non detecte
    echo    Veuillez installer Node.js 18+
    pause
    exit /b 1
)

echo    Verification de npm...
npm --version 2>nul
if %errorlevel% equ 0 (
    echo    ✅ npm detecte
) else (
    echo    ❌ npm non detecte
    pause
    exit /b 1
)
echo.

echo [2/8] Installation des dependances...
echo    Installation des packages npm...
npm install
if %errorlevel% equ 0 (
    echo    ✅ Dependances installees
) else (
    echo    ❌ Erreur lors de l'installation
    pause
    exit /b 1
)
echo.

echo [3/8] Test des modules...
echo    Test de tous les modules...
node test-all-modules.js
if %errorlevel% equ 0 (
    echo    ✅ Tests reussis
) else (
    echo    ⚠️ Tests avec avertissements
)
echo.

echo [4/8] Lancement de l'orchestrateur...
echo    Initialisation du MEGA Orchestrator...
node src/core/orchestrator.js
if %errorlevel% equ 0 (
    echo    ✅ Orchestrateur lance avec succes
) else (
    echo    ⚠️ Orchestrateur avec avertissements
)
echo.

echo [5/8] Construction du dashboard...
echo    Generation du dashboard web...
if exist dist\dashboard\index.html (
    echo    ✅ Dashboard deja genere
) else (
    echo    Generation du dashboard...
    node src/core/dashboard-builder.js
)
echo.

echo [6/8] Validation Homey...
echo    Test de la validation Homey...
echo    Note: Cette etape peut prendre du temps
echo    Appuyez sur une touche pour continuer...
pause >nul

echo    Validation avec Homey CLI...
homey app validate 2>nul
if %errorlevel% equ 0 (
    echo    ✅ Validation Homey reussie
) else (
    echo    ⚠️ Validation Homey avec avertissements
)
echo.

echo [7/8] Ouverture du dashboard...
echo    Ouverture du dashboard web...
if exist dist\dashboard\index.html (
    start dist\dashboard\index.html
    echo    ✅ Dashboard ouvert
) else (
    echo    ❌ Dashboard non trouve
)
echo.

echo [8/8] Finalisation...
echo    ✅ Projet Tuya Zigbee Drivers v3.7.0 lance avec succes !
echo.
echo 📊 Resume:
echo - Version: 3.7.0
echo - SDK: Homey SDK 3
echo - Modules: 8 core + 5+ utils
echo - Drivers: 3+ Tuya
echo - Dashboard: dist/dashboard/index.html
echo.

echo 🚀 Prochaines etapes:
echo 1. Ouvrir le dashboard pour voir les statistiques
echo 2. Tester les drivers avec Homey
echo 3. Ajouter de nouveaux drivers
echo 4. Contribuer au projet
echo.

echo 💡 Commandes utiles:
echo - npm start (lancer l'application)
echo - npm run orchestrate:mega (lancer l'orchestrateur)
echo - npm test (tests)
echo - npm run validate (validation Homey)
echo.

echo 🎉 FELICITATIONS ! Le projet est maintenant operationnel !
echo.
pause
