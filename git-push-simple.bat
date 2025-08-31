@echo off
echo =======================================
echo  Configuration et Push Git Simplifie
echo =======================================
echo.

:: Configuration Git
echo [1/5] Configuration de Git...
git config --global user.name "dlnraja"
git config --global user.email "dylan.rajasekaram@gmail.com"

:: Vérification de l'état
echo.
echo [2/5] Verification de l'etat du depot...
git status

:: Ajout des fichiers
echo.
echo [3/5] Ajout de tous les fichiers...
git add .

:: Création du commit
echo.
echo [4/5] Creation du commit...
git commit -m "Mise a jour du projet Tuya Zigbee"

:: Push vers GitHub
echo.
echo [5/5] Envoi des modifications vers GitHub...
echo URL du depot: https://github.com/dlnraja/com.tuya.zigbee.git
echo Branche: master
echo.

git push -u origin master

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERREUR: Impossible de pousser vers la branche master
    echo Tentative avec la branche main...
    git push -u origin main
    
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERREUR: Echec du push vers GitHub
        echo Verifiez votre connexion Internet et vos identifiants.
    ) else (
        echo.
        echo SUCCES: Modifications poussees vers la branche main
    )
) else (
    echo.
    echo SUCCES: Modifications poussees vers la branche master
)

echo.
echo =======================================
echo Operation terminee
echo =======================================
echo.
pause
