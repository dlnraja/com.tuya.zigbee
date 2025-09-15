@echo off
echo ========================================
echo TEST PUBLICATION MANUELLE
echo ========================================

echo.
echo 1. Nettoyage cache...
if exist .homeybuild rmdir /s /q .homeybuild

echo.
echo 2. Validation pre-publication...
homey app validate --level publish
if %errorlevel% neq 0 (
    echo ERREUR VALIDATION - ARRET
    pause
    exit /b 1
)

echo.
echo 3. Publication interactive...
echo REPONSES A DONNER:
echo - Uncommitted changes? y
echo - Update version? n (deja v1.0.28)
echo - Changelog: v1.0.28 - Complete device reorganization with professional unbranded categories. Fixed all validation errors, updated driver structure following SDK3 standards. Enhanced multilingual support and improved asset management. Ready for production deployment.

echo.
homey app publish

echo.
echo ========================================
echo PUBLICATION TERMINEE
echo ========================================
pause
