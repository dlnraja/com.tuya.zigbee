@echo off
setlocal enabledelayedexpansion

echo Création du rapport d'intégration...
echo. > integration-report.txt

echo ===== RAPPORT D'INTÉGRATION ===== >> integration-report.txt
echo Date: %date% %time% >> integration-report.txt
echo. >> integration-report.txt

echo === STRUCTURE DU PROJET === >> integration-report.txt
dir /s /b /ad | find /c "\" >> count.txt
set /p dirCount=<count.txt
del count.txt
echo Nombre total de dossiers: %dirCount% >> integration-report.txt

dir /s /b /a-d | find /c "\" >> count.txt
set /p fileCount=<count.txt
del count.txt
echo Nombre total de fichiers: %fileCount% >> integration-report.txt
echo. >> integration-report.txt

echo === DRIVERS === >> integration-report.txt
cd drivers
set driverCount=0
for /d %%i in (*) do (
    set /a driverCount+=1
    echo [%%i] >> ..\integration-report.txt
    
    if exist "%%i\driver.compose.json" (
        echo - Fichier de configuration: OUI >> ..\integration-report.txt
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"id\"" "%%i\driver.compose.json"') do (
            set id=%%a
            set id=!id:~2,-2!
            echo - ID: !id! >> ..\integration-report.txt
        )
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"en\"" "%%i\driver.compose.json"') do (
            set name=%%a
            set name=!name:~2,-2!
            echo - Nom (EN): !name! >> ..\integration-report.txt
            goto :next1
        )
        :next1
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"class\"" "%%i\driver.compose.json"') do (
            set class=%%a
            set class=!class:~2,-2!
            echo - Classe: !class! >> ..\integration-report.txt
            goto :next2
        )
        :next2
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"capabilities\"" "%%i\driver.compose.json"') do (
            set capabilities=%%a
            echo - Capabilités: !capabilities! >> ..\integration-report.txt
            goto :next3
        )
        :next3
        
        if exist "%%i\assets" (
            echo - Dossier assets: OUI >> ..\integration-report.txt
        ) else (
            echo - Dossier assets: NON >> ..\integration-report.txt
        )
        
    else
        echo - Fichier de configuration: NON >> ..\integration-report.txt
    fi
    
    echo. >> ..\integration-report.txt
)
cd ..

echo. >> integration-report.txt
echo === RÉSUMÉ === >> integration-report.txt
echo Nombre total de drivers: %driverCount% >> integration-report.txt

echo. >> integration-report.txt
echo ===== FIN DU RAPPORT ===== >> integration-report.txt

echo Rapport généré avec succès: integration-report.txt
