off
echo
TUYA ZIGBEE PROJECT - QUICK START
echo
================================
echo
1. Validation des drivers...
powershell
-ExecutionPolicy
Bypass
-File
scripts/validate-all-drivers.ps1
echo
2. Amélioration des drivers...
powershell
-ExecutionPolicy
Bypass
-File
scripts/enhance-all-drivers.ps1
echo
3. Test des workflows...
powershell
-ExecutionPolicy
Bypass
-File
scripts/test-workflows.ps1
echo
PROJET TERMINÉ AVEC SUCCÈS!
pause
