@echo off
setlocal enabledelayedexpansion

echo Création du rapport d'intégration...
set "report=integration-report.txt"

echo ===== RAPPORT D'INTÉGRATION ===== > %report%
echo Date: %date% %time% >> %report%
echo. >> %report%

echo === STRUCTURE DU PROJET === >> %report%
echo. >> %report%

echo Dossiers principaux: >> %report%
for /d %%i in (*) do (
    if not "%%i"=="node_modules" (
        echo - %%i >> %report%
    )
)

echo. >> %report%
echo === DRIVERS === >> %report%
cd drivers
set count=0
set valid=0

for /d %%i in (*) do (
    set /a count+=1
    echo [%%i] >> ..\%report%
    
    if exist "%%i\driver.compose.json" (
        echo - Configuration: OUI >> ..\%report%
        
        for /f "usebackq tokens=2 delims=:" %%a in (`findstr /i "\"name\"" "%%i\driver.compose.json"`) do (
            set name=%%a
            set name=!name:\"=!
            echo - Nom: !name! >> ..\%report%
        )
        
        for /f "usebackq tokens=2 delims=:" %%a in (`findstr /i "\"class\"" "%%i\driver.compose.json"`) do (
            set class=%%a
            set class=!class:\"=!
            echo - Classe: !class! >> ..\%report%
        )
        
        set /a valid+=1
    ) else (
        echo - Configuration: NON >> ..\%report%
    )
    
    echo. >> ..\%report%
)
cd ..

echo. >> %report%
echo === RÉSUMÉ === >> %report%
echo Nombre total de drivers: %count% >> %report%
echo Nombre de drivers valides: %valid% >> %report%

echo. >> %report%
echo ===== FIN DU RAPPORT ===== >> %report%

type %report%
echo.
echo Rapport généré: %report%
