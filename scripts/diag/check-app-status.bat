@echo off
REM ═══════════════════════════════════════════════════════════════════
REM check-app-status.bat — Vérifie le statut des 2 apps Tuya sur Homey Pro
REM À exécuter manuellement dans un terminal sur la machine de Dylan.
REM ═══════════════════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════════════
echo   VÉRIFICATION DES APPS TUYA SUR HOMEY PRO
echo ═══════════════════════════════════════════════════════════════
echo.

echo [1] Homey CLI version :
call homey --version
echo.

echo [2] Compte connecté :
call homey whoami
echo.

echo [3] Validation app MASTER (com.dlnraja.tuya.zigbee) :
echo.
cd /d "C:\Users\HP\Desktop\homey-app\tuya_repair"
echo Validation en cours (peut prendre 2-3 min pour app.json 5MB)...
call homey app validate --level debug
echo.

echo [4] Validation app STABLE-V5 (com.dlnraja.tuya.zigbee.stable) :
echo.
cd /d "C:\Users\HP\Desktop\homey-app\tuya_repair_v5"
call homey app validate --level debug
echo.

echo [5] Publier MASTER en test :
echo.
cd /d "C:\Users\HP\Desktop\homey-app\tuya_repair"
echo Voulez-vous publier MASTER en test ? (Ctrl+C pour annuler)
pause
call homey app publish
echo.

echo [6] Publier STABLE-V5 en test :
echo.
cd /d "C:\Users\HP\Desktop\homey-app\tuya_repair_v5"
echo Voulez-vous publier STABLE-V5 en test ? (Ctrl+C pour annuler)
pause
call homey app publish
echo.

echo ═══════════════════════════════════════════════════════════════
echo   VÉRIFICATION TERMINÉE
echo   Vérifiez le portail dev : https://developer.athom.com/apps
echo ═══════════════════════════════════════════════════════════════
echo.
pause
