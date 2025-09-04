@echo off
echo Configuration de Git...
git config --global user.name "dlnraja"
git config --global user.email "dylan.rajasekaram@gmail.com"

echo Ajout des fichiers...
git add .

echo Creation du commit...
git commit -m "Mise a jour du projet Tuya Zigbee"

echo Pousse vers la branche master...
git push -u origin master --force

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Tentative avec la branche main...
    git push -u origin main --force
)

echo.
echo Operation terminee. Verifiez la sortie ci-dessus pour les erreurs.
pause
