@echo off
echo Configuration de Git...
git config --global user.name "dlnraja"
git config --global user.email "dylan.rajasekaram@gmail.com"

echo.
echo Verification de l'etat du depot...
git status

echo.
echo Ajout des fichiers...
git add .

echo.
echo Creation du commit...
git commit -m "Mise a jour du projet Tuya Zigbee"

echo.
echo Pousse vers GitHub...
git push -u origin master

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Tentative avec la branche main...
    git push -u origin main
)

echo.
pause
