@echo off
echo ========================================
echo PUBLICATION DIRECTE AUTOMATISEE
echo ========================================

echo.
echo 1. Nettoyage environnement...
taskkill /f /im homey.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
if exist .homeybuild rmdir /s /q .homeybuild

echo.
echo 2. Test validation rapide...
timeout /t 2 >nul
homey app validate --level publish

if %errorlevel% equ 0 (
    echo ✅ VALIDATION REUSSIE
) else (
    echo ❌ VALIDATION ECHOUEE - ARRET
    pause
    exit /b 1
)

echo.
echo 3. Commit et Push GitHub...
git add .
git commit -m "feat: Add Johan Bendz scene remotes support - v1.0.28 final"
git push origin main

echo.
echo 4. Publication Homey...
echo.
echo PREPARATION REPONSES AUTOMATIQUES:
echo - Uncommitted changes? y
echo - Update version? n  
echo - Changelog: [AUTOMATIQUE]

echo.
(
echo y
echo n
echo v1.0.28 - Complete Johan Bendz Compatibility Update
echo.
echo ✨ NEW FEATURES:
echo • Added 2 Gang Scene Remote ^(TS0042^) - _TZ3000_dfgbtub0 support
echo • Added 4 Gang Scene Remote ^(TS0044^) - _TZ3000_wkai4ga5 support  
echo • Enhanced Johan Bendz device compatibility with expanded manufacturer IDs
echo • Professional unbranded device categorization following SDK3 standards
echo.
echo 🔧 IMPROVEMENTS:
echo • Updated support URL to Homey Community forum thread
echo • Fixed all validation errors and image size requirements ^(75x75^)
echo • Multi-language tags support ^(EN/FR/NL^)
echo • Clean asset management and driver structure
echo.
echo 🐛 BUG FIXES:  
echo • Corrected all driver image paths after reorganization
echo • Fixed manifest.tags format to object with language keys
echo • Resolved .homeybuild cache conflicts
echo • Enhanced device compatibility matrix
echo.
echo 📋 TECHNICAL:
echo • Full SDK3 compliance with proper endpoint definitions
echo • Local Zigbee operation - no cloud dependencies  
echo • Professional flow cards and device capabilities
echo • Automated CI/CD pipeline with GitHub Actions
echo.
echo This version ensures complete compatibility with Johan Bendz's original Tuya Zigbee app while providing modern SDK3 architecture and professional device organization.
) | homey app publish

echo.
echo ========================================
echo PUBLICATION TERMINEE
echo ========================================

if %errorlevel% equ 0 (
    echo ✅ PUBLICATION REUSSIE!
    echo ✅ App publié sur Homey App Store
    echo ✅ Support complet devices Johan Bendz
    echo ✅ Scene remotes TS0042/TS0044 ajoutés
) else (
    echo ❌ ECHEC PUBLICATION
)

pause
