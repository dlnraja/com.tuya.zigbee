@echo off
setlocal enabledelayedexpansion

echo Création du rapport d'intégration...
echo. > integration-report.txt

echo ===== RAPPORT D'INTÉGRATION ===== >> integration-report.txt
echo Date: %date% %time% >> integration-report.txt
echo. >> integration-report.txt

echo === STRUCTURE DU PROJET === >> integration-report.txt

echo. >> integration-report.txt
echo Dossiers racine: >> integration-report.txt
dir /b /ad >> temp.txt
findstr /v "node_modules" temp.txt >> integration-report.txt
del temp.txt

echo. >> integration-report.txt
echo Fichiers racine: >> integration-report.txt
dir /b /a-d | findstr /v "node_modules" >> integration-report.txt

echo. >> integration-report.txt
echo === DRIVERS === >> integration-report.txt
cd drivers
set count=0
for /d %%i in (*) do (
    set /a count+=1
    echo [%%i] >> ..\integration-report.txt
    
    if exist "%%i\driver.compose.json" (
        echo - Configuration: OUI >> ..\integration-report.txt
        findstr /i "name\"\s*:" "%%i\driver.compose.json" >> ..\integration-report.txt
        findstr /i "class\"\s*:" "%%i\driver.compose.json" >> ..\integration-report.txt
    else
        echo - Configuration: NON >> ..\integration-report.txt
    fi
    
    echo. >> ..\integration-report.txt
)
cd ..

echo. >> integration-report.txt
echo === RÉSUMÉ === >> integration-report.txt
echo Nombre total de drivers: %count% >> integration-report.txt

echo. >> integration-report.txt
echo ===== FIN DU RAPPORT ===== >> integration-report.txt

echo Rapport généré avec succès: integration-report.txt
