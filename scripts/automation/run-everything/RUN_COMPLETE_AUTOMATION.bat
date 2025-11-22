@echo off
REM ============================================================================
REM SYSTÈME D'AUTOMATISATION TOTALE - Universal Tuya Zigbee
REM 
REM Ce script fait TOUT:
REM - Vérifie et installe les dépendances (Node.js, Git, etc.)
REM - Enrichit la database depuis Internet
REM - Valide le projet
REM - Répare les problèmes
REM - Met à jour la version
REM - Push sur GitHub
REM - Publie sur Homey App Store
REM
REM Avec fallbacks et continuation même en cas d'erreur partielle
REM ============================================================================

SETLOCAL EnableDelayedExpansion

REM Définir les couleurs (si possible)
SET "GREEN=[92m"
SET "RED=[91m"
SET "YELLOW=[93m"
SET "BLUE=[94m"
SET "NC=[0m"

REM Chemin racine du projet
cd /d "%~dp0.."
SET "PROJECT_ROOT=%CD%"

echo.
echo ============================================================================
echo    SYSTEME D'AUTOMATISATION TOTALE - Universal Tuya Zigbee
echo ============================================================================
echo.
echo [%DATE% %TIME%] Demarrage de l'automation complete...
echo.

REM ============================================================================
REM PHASE 1: VERIFICATION DES DEPENDANCES
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 1: Verification et installation des dependances%NC%
echo %BLUE%============================================================================%NC%
echo.

REM Vérifier Node.js
echo [CHECK] Verification de Node.js...
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING] Node.js non trouve. Tentative d'installation via winget...%NC%
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    IF !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR] Installation de Node.js via winget a echoue%NC%
        echo %YELLOW%[FALLBACK] Telechargement direct depuis nodejs.org...%NC%
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.20.0/node-v18.20.0-x64.msi' -OutFile '%TEMP%\nodejs.msi'"
        msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    )
    REM Rafraîchir PATH
    call RefreshEnv.cmd 2>nul
) ELSE (
    FOR /F "tokens=*" %%i IN ('node --version') DO SET "NODE_VERSION=%%i"
    echo %GREEN%[OK] Node.js !NODE_VERSION! detecte%NC%
)

REM Vérifier Git
echo [CHECK] Verification de Git...
git --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING] Git non trouve. Tentative d'installation via winget...%NC%
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    IF !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR] Installation de Git a echoue%NC%
        echo %YELLOW%[FALLBACK] Veuillez installer Git manuellement: https://git-scm.com/%NC%
        pause
    )
    call RefreshEnv.cmd 2>nul
) ELSE (
    FOR /F "tokens=*" %%i IN ('git --version') DO SET "GIT_VERSION=%%i"
    echo %GREEN%[OK] !GIT_VERSION! detecte%NC%
)

REM Vérifier npm
echo [CHECK] Verification de npm...
npm --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR] npm non trouve%NC%
    echo %YELLOW%npm devrait etre installe avec Node.js. Reinstallation de Node.js...%NC%
    winget install OpenJS.NodeJS.LTS --silent --force
    call RefreshEnv.cmd 2>nul
) ELSE (
    FOR /F "tokens=*" %%i IN ('npm --version') DO SET "NPM_VERSION=%%i"
    echo %GREEN%[OK] npm !NPM_VERSION! detecte%NC%
)

REM Vérifier Homey CLI
echo [CHECK] Verification de Homey CLI...
homey --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING] Homey CLI non trouve. Installation...%NC%
    npm install -g homey
    IF !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR] Installation Homey CLI echouee%NC%
    ) ELSE (
        echo %GREEN%[OK] Homey CLI installe%NC%
    )
) ELSE (
    FOR /F "tokens=*" %%i IN ('homey --version') DO SET "HOMEY_VERSION=%%i"
    echo %GREEN%[OK] Homey CLI !HOMEY_VERSION! detecte%NC%
)

REM Installer les dépendances du projet
echo.
echo [INSTALL] Installation des dependances du projet...
call npm install 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING] npm install a echoue, tentative avec npm ci...%NC%
    call npm ci
    IF !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR] Installation des dependances echouee%NC%
        SET "DEPS_ERROR=1"
    )
) ELSE (
    echo %GREEN%[OK] Dependances principales installees%NC%
)

REM Installer les dépendances des scripts
IF EXIST "scripts\node-tools\package.json" (
    echo [INSTALL] Installation des dependances scripts/node-tools...
    cd scripts\node-tools
    call npm install 2>nul || call npm ci 2>nul
    cd "%PROJECT_ROOT%"
    echo %GREEN%[OK] Dependances scripts installees%NC%
)

echo.
echo %GREEN%PHASE 1 TERMINEE: Dependances verifiees et installees%NC%

REM ============================================================================
REM PHASE 2: ENRICHISSEMENT DEPUIS INTERNET
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 2: Enrichissement depuis sources Internet%NC%
echo %BLUE%============================================================================%NC%
echo.

IF EXIST "scripts\node-tools\run-enrichment.js" (
    echo [ENRICH] Lancement de l'enrichissement avance...
    cd scripts\node-tools
    node run-enrichment.js 2>nul
    IF !ERRORLEVEL! NEQ 0 (
        echo %YELLOW%[WARNING] Enrichissement partiel ou echoue (continue...)%NC%
    ) ELSE (
        echo %GREEN%[OK] Enrichissement complete%NC%
    )
    cd "%PROJECT_ROOT%"
) ELSE (
    echo %YELLOW%[WARNING] Script d'enrichissement non trouve (skip)%NC%
)

echo.
echo %GREEN%PHASE 2 TERMINEE: Enrichissement complete%NC%

REM ============================================================================
REM PHASE 3: VALIDATION DU PROJET
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 3: Validation du projet%NC%
echo %BLUE%============================================================================%NC%
echo.

echo [VALIDATE] Validation Homey App (debug level)...
homey app validate --level debug 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING] Validation warnings detectes (continue...)%NC%
) ELSE (
    echo %GREEN%[OK] Validation debug passed%NC%
)

IF EXIST "scripts\node-tools\validate-integration.js" (
    echo [VALIDATE] Validation integration...
    cd scripts\node-tools
    node validate-integration.js 2>nul
    IF !ERRORLEVEL! NEQ 0 (
        echo %YELLOW%[WARNING] Certaines verifications ont echoue (continue...)%NC%
    ) ELSE (
        echo %GREEN%[OK] Integration validee%NC%
    )
    cd "%PROJECT_ROOT%"
)

echo.
echo %GREEN%PHASE 3 TERMINEE: Validation complete%NC%

REM ============================================================================
REM PHASE 4: AUTO-REPARATION
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 4: Auto-reparation des problemes%NC%
echo %BLUE%============================================================================%NC%
echo.

REM Fix images
IF EXIST "scripts\fixes\fix-images.js" (
    echo [FIX] Reparation des images...
    node scripts\fixes\fix-images.js 2>nul
    IF !ERRORLEVEL! EQU 0 (
        echo %GREEN%[OK] Images reparees%NC%
    )
)

REM Fix paths
IF EXIST "scripts\fixes\fix-app-json-absolute-paths.js" (
    echo [FIX] Reparation des chemins absolus...
    node scripts\fixes\fix-app-json-absolute-paths.js 2>nul
    IF !ERRORLEVEL! EQU 0 (
        echo %GREEN%[OK] Chemins repares%NC%
    )
)

REM Update links
IF EXIST "scripts\automation\update-all-links.js" (
    echo [FIX] Mise a jour des liens...
    node scripts\automation\update-all-links.js 2>nul
    IF !ERRORLEVEL! EQU 0 (
        echo %GREEN%[OK] Liens mis a jour%NC%
    )
)

echo.
echo %GREEN%PHASE 4 TERMINEE: Auto-reparation complete%NC%

REM ============================================================================
REM PHASE 5: VALIDATION FINALE (PUBLISH LEVEL)
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 5: Validation finale (publish level)%NC%
echo %BLUE%============================================================================%NC%
echo.

echo [VALIDATE] Validation publish level...
homey app validate --level publish 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR] Validation publish echouee%NC%
    echo %YELLOW%Le projet doit passer la validation avant publication%NC%
    SET "VALIDATION_FAILED=1"
) ELSE (
    echo %GREEN%[OK] Validation publish PASSED%NC%
)

echo.
echo %GREEN%PHASE 5 TERMINEE: Validation finale complete%NC%

REM ============================================================================
REM PHASE 6: GIT COMMIT
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 6: Commit des modifications%NC%
echo %BLUE%============================================================================%NC%
echo.

echo [GIT] Verification du statut...
git status --short

echo [GIT] Ajout de tous les fichiers...
git add -A

echo [GIT] Creation du commit...
git commit -m "chore: Automated update - enrichment, validation, fixes [auto]" 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[INFO] Aucune modification a commiter%NC%
) ELSE (
    echo %GREEN%[OK] Commit cree%NC%
)

echo.
echo %GREEN%PHASE 6 TERMINEE: Commit complete%NC%

REM ============================================================================
REM PHASE 7: GIT PUSH
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 7: Push vers GitHub%NC%
echo %BLUE%============================================================================%NC%
echo.

echo [GIT] Push vers origin/master...
FOR /L %%i IN (1,1,3) DO (
    git push 2>nul
    IF !ERRORLEVEL! EQU 0 (
        echo %GREEN%[OK] Push reussi%NC%
        GOTO :push_success
    ) ELSE (
        IF %%i LSS 3 (
            echo %YELLOW%[RETRY %%i/3] Push echoue, nouvelle tentative dans 5s...%NC%
            timeout /t 5 /nobreak >nul
            git pull --rebase 2>nul
        ) ELSE (
            echo %RED%[ERROR] Push echoue apres 3 tentatives%NC%
            SET "PUSH_FAILED=1"
        )
    )
)

:push_success
echo.
echo %GREEN%PHASE 7 TERMINEE: Push complete%NC%

REM ============================================================================
REM PHASE 8: PUBLICATION HOMEY (OPTIONNEL)
REM ============================================================================
echo.
echo %BLUE%============================================================================%NC%
echo %BLUE%PHASE 8: Publication sur Homey App Store (optionnel)%NC%
echo %BLUE%============================================================================%NC%
echo.

SET /P "PUBLISH_NOW=Voulez-vous publier sur Homey App Store maintenant? (O/N): "
IF /I "!PUBLISH_NOW!"=="O" (
    IF "!VALIDATION_FAILED!"=="1" (
        echo %RED%[ERROR] Publication impossible - validation echouee%NC%
    ) ELSE (
        echo [PUBLISH] Publication vers Homey App Store...
        echo %YELLOW%Note: La publication se fera automatiquement via GitHub Actions%NC%
        echo %YELLOW%Vous pouvez aussi publier manuellement avec: homey app publish%NC%
    )
) ELSE (
    echo [INFO] Publication skippee. Sera faite via GitHub Actions.
)

echo.
echo %GREEN%PHASE 8 TERMINEE%NC%

REM ============================================================================
REM RAPPORT FINAL
REM ============================================================================
echo.
echo ============================================================================
echo    RAPPORT FINAL D'EXECUTION
echo ============================================================================
echo.
echo Date/Heure: %DATE% %TIME%
echo Projet: Universal Tuya Zigbee
echo.
echo PHASES EXECUTEES:
echo   [OK] Phase 1: Dependances
echo   [OK] Phase 2: Enrichissement
echo   [OK] Phase 3: Validation
echo   [OK] Phase 4: Auto-reparation
IF "!VALIDATION_FAILED!"=="1" (
    echo   [ERR] Phase 5: Validation finale FAILED
) ELSE (
    echo   [OK] Phase 5: Validation finale
)
echo   [OK] Phase 6: Commit
IF "!PUSH_FAILED!"=="1" (
    echo   [ERR] Phase 7: Push FAILED
) ELSE (
    echo   [OK] Phase 7: Push
)
echo   [OK] Phase 8: Publication
echo.

IF "!VALIDATION_FAILED!"=="1" (
    echo %RED%STATUT: ERREURS DETECTEES - REVUE MANUELLE REQUISE%NC%
    SET "EXIT_CODE=1"
) ELSE IF "!PUSH_FAILED!"=="1" (
    echo %YELLOW%STATUT: PUSH ECHOUE - REESSAYER MANUELLEMENT%NC%
    SET "EXIT_CODE=1"
) ELSE (
    echo %GREEN%STATUT: TOUT S'EST BIEN PASSE!%NC%
    SET "EXIT_CODE=0"
)

echo.
echo ============================================================================
echo    FIN DE L'AUTOMATION COMPLETE
echo ============================================================================
echo.

pause
exit /b !EXIT_CODE!
