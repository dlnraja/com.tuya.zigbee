@echo off
echo === Test Simple ===
echo Date: %date% %time%
echo.

echo 1. Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js est installé
    for /f "tokens=*" %%a in ('node -v') do echo Version: %%a
) else (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    echo Téléchargez-le depuis https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 2. Vérification de l'accès au système de fichiers...
if exist . (
    echo ✅ Accès au répertoire courant OK
) else (
    echo ❌ Impossible d'accéder au répertoire courant
    pause
    exit /b 1
)

echo.
echo 3. Test d'écriture de fichier...
echo Test de fichier > test-file.txt
if exist test-file.txt (
    echo ✅ Écriture de fichier OK
    del test-file.txt
) else (
    echo ❌ Impossible d'écrire des fichiers
    pause
    exit /b 1
)

echo.
echo 4. Exécution d'un script Node.js simple...
echo console.log('Test réussi!'); > test.js
node test.js
if %errorlevel% equ 0 (
    echo ✅ Exécution de script Node.js OK
    del test.js
) else (
    echo ❌ Échec de l'exécution du script Node.js
    del test.js
    pause
    exit /b 1
)

echo.
echo === Test réussi ===
pause
