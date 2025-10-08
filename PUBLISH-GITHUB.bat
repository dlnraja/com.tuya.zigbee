@echo off
chcp 65001 >nul
color 0B
cls

echo ╔════════════════════════════════════════════════════════════════════╗
echo ║        TUYA ZIGBEE - PUBLICATION VIA GITHUB ACTIONS               ║
echo ║        Utilise les workflows officiels Homey                       ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo 📅 %date% %time%
echo 📂 %cd%
echo.

REM ═══ VÉRIFICATIONS ═══
echo [1/4] Vérification environnement...
echo ────────────────────────────────────────────────────────────────────

node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js non installé
    pause
    exit /b 1
)
echo ✅ Node.js OK

git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git non installé
    pause
    exit /b 1
)
echo ✅ Git OK

if not exist "app.json" (
    echo ❌ app.json introuvable
    pause
    exit /b 1
)
echo ✅ app.json OK
echo.

REM ═══ GÉNÉRATION IMAGES ═══
echo [2/4] Génération images (optionnel)...
echo ────────────────────────────────────────────────────────────────────

choice /C YN /T 5 /D N /M "Régénérer les images"
if %ERRORLEVEL%==1 (
    node -e "require('canvas')" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Installation canvas...
        call npm install canvas
    )
    
    if exist "scripts\SMART_IMAGE_GENERATOR.js" (
        node scripts\SMART_IMAGE_GENERATOR.js
        echo ✅ Images générées
    ) else if exist "scripts\FIX_ALL_IMAGES.js" (
        node scripts\FIX_ALL_IMAGES.js
        echo ✅ Images corrigées
    ) else (
        echo ⚠️  Pas de générateur d'images trouvé
    )
) else (
    echo ℹ️  Images non régénérées
)
echo.

REM ═══ VALIDATION LOCALE ═══
echo [3/4] Validation locale (optionnel)...
echo ────────────────────────────────────────────────────────────────────

where homey >nul 2>&1
if %ERRORLEVEL%==0 (
    choice /C YN /T 5 /D Y /M "Valider l'app localement"
    if %ERRORLEVEL%==1 (
        if exist .homeybuild rmdir /s /q .homeybuild
        if exist .homeycompose rmdir /s /q .homeycompose
        
        homey app validate
        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo ⚠️  Validation locale a échoué
            choice /C YN /M "Continuer quand même"
            if %ERRORLEVEL%==2 (
                echo ❌ Arrêté par l'utilisateur
                pause
                exit /b 1
            )
        )
        echo ✅ Validation OK
    )
) else (
    echo ℹ️  Homey CLI non installé - validation sautée
)
echo.

REM ═══ GIT COMMIT & PUSH ═══
echo [4/4] Commit et push vers GitHub...
echo ────────────────────────────────────────────────────────────────────

git status --short
echo.

set /p COMMIT_MSG="Message de commit (vide = 'feat: update via PUBLISH-GITHUB.bat'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=feat: update via PUBLISH-GITHUB.bat

git add -A
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git add échoué
    pause
    exit /b 1
)
echo ✅ Changements staged

git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% NEQ 0 (
    echo ℹ️  Rien à committer
    choice /C YN /M "Continuer sans commit"
    if %ERRORLEVEL%==2 (
        pause
        exit /b 1
    )
) else (
    echo ✅ Commit effectué
)

echo.
echo 🚀 Push vers GitHub...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Push échoué!
    pause
    exit /b 1
)

echo ✅ Push réussi!
echo.

REM ═══ SUCCESS ═══
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║              ✅ PUSH VERS GITHUB RÉUSSI                            ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo 📊 Le workflow GitHub Actions va démarrer automatiquement:
echo.
echo   1. ✅ Validation SDK3 (athombv/github-action-homey-app-validate)
echo   2. 📋 Génération changelog depuis commits
echo   3. 🔢 Détection version automatique (patch/minor/major)
echo   4. 🆙 Update version (athombv/github-action-homey-app-version)
echo   5. 💾 Commit + tag automatique
echo   6. 🚀 Publication Homey App Store (athombv/github-action-homey-app-publish)
echo   7. 📦 GitHub Release créée
echo.
echo 🔗 Monitorer la publication:
echo.
echo   GitHub Actions:
echo   https://github.com/dlnraja/com.tuya.zigbee/actions
echo.
echo   Homey Dashboard:
echo   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
echo.
echo ════════════════════════════════════════════════════════════════════
echo.
echo Press any key to close...
pause >nul
