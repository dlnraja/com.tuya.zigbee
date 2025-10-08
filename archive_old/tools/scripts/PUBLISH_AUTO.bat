@echo off
echo.
echo ===============================================
echo   PUBLICATION AUTOMATIQUE - HOMEY APP
echo ===============================================
echo.

REM Auto-réponses
(
echo y
echo y
echo.
echo UNBRANDED reorganization + Smart recovery + 163 drivers validated
echo y
echo y
) | homey app publish

echo.
echo ===============================================
echo   Publication terminee!
echo ===============================================
echo.
pause
