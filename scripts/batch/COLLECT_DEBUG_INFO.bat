@echo off
echo.
echo ===================================================================
echo    COLLECTION INFORMATIONS DEBUG
echo ===================================================================
echo.
echo Ce script va collecter toutes les infos pour debug...
echo.

set OUTPUT=DEBUG_INFO_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set OUTPUT=%OUTPUT: =0%

echo Saving to: %OUTPUT%
echo.

echo ===================================================================  > %OUTPUT%
echo    DEBUG INFORMATION COLLECTION >> %OUTPUT%
echo    Date: %date% %time% >> %OUTPUT%
echo ===================================================================  >> %OUTPUT%
echo. >> %OUTPUT%

echo [1/8] Collecting Homey Info...
echo. >> %OUTPUT%
echo === HOMEY INFO === >> %OUTPUT%
call homey info >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [2/8] Collecting App Info...
echo === APP INFO === >> %OUTPUT%
call homey app validate >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [3/8] Checking Devices...
echo === DEVICES LIST === >> %OUTPUT%
call homey devices list >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [4/8] Checking Zigbee Network...
echo === ZIGBEE INFO === >> %OUTPUT%
call homey zigbee list >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [5/8] Collecting Recent Logs...
echo === APP LOGS (Last 100 lines) === >> %OUTPUT%
call homey app log com.dlnraja.tuya.zigbee --lines 100 >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [6/8] Checking App Version...
echo === CURRENT VERSION === >> %OUTPUT%
type app.json | find "version" >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [7/8] Checking Drivers...
echo === DRIVERS === >> %OUTPUT%
dir /b drivers >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo [8/8] Environment Info...
echo === ENVIRONMENT === >> %OUTPUT%
echo Node Version: >> %OUTPUT%
node --version >> %OUTPUT% 2>&1
echo. >> %OUTPUT%
echo Homey CLI Version: >> %OUTPUT%
homey --version >> %OUTPUT% 2>&1
echo. >> %OUTPUT%

echo ===================================================================  >> %OUTPUT%
echo    END OF DEBUG INFORMATION >> %OUTPUT%
echo ===================================================================  >> %OUTPUT%

echo.
echo ===================================================================
echo   Collection complete!
echo ===================================================================
echo.
echo File saved: %OUTPUT%
echo.
echo Vous pouvez maintenant:
echo   1. Ouvrir le fichier pour voir les infos
echo   2. Partager le contenu pour analyse
echo.

echo Opening file...
notepad %OUTPUT%
