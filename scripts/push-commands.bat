@echo off
echo Configuration de Git...
git config --global user.name "dlnraja"
git config --global user.email "dylan.rajasekaram@gmail.com"

echo Ajout des fichiers...
git add .

echo Creation du commit...
git commit -m "Mise a jour du projet Tuya Zigbee"

echo Pousse vers la branche principale...
git push origin master || git push origin main

echo.
echo Operation terminee. Appuyez sur une touche pour quitter...
pause > nul
