@echo off
echo === Test d'environnement ===
echo Date: %date% %time%
echo.

echo === Vérification de Node.js ===
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js est dans le PATH
    node --version
) else (
    echo [ERREUR] Node.js n'est pas dans le PATH
)
echo.

echo === Test d'écriture de fichier ===
echo Test d'écriture > test-file.txt
if exist test-file.txt (
    echo [OK] Écriture de fichier réussie
    type test-file.txt
    del test-file.txt
) else (
    echo [ERREUR] Impossible d'écrire dans le répertoire courant
)
echo.

echo === Fin du test ===
pause
