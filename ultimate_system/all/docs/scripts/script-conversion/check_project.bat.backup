@echo off
echo Project Structure Check > project_structure.txt
echo ===================== >> project_structure.txt
echo. >> project_structure.txt

echo Checking Node.js and npm...
node -v >> project_structure.txt 2>&1
npm -v >> project_structure.txt 2>&1

echo. >> project_structure.txt
echo Directory Structure: >> project_structure.txt
echo ------------------- >> project_structure.txt
dir /b /a:d >> project_structure.txt

echo. >> project_structure.txt
echo Checking for required files... >> project_structure.txt
echo --------------------------- >> project_structure.txt

dir /b package.json app.json README.md >> project_structure.txt 2>&1

echo. >> project_structure.txt
echo Checking drivers directory... >> project_structure.txt
echo ------------------------- >> project_structure.txt

if exist drivers (
    echo Drivers directory exists. >> project_structure.txt
    dir /b drivers | find /c /v "" > temp_count.txt
    set /p driver_count= < temp_count.txt
    echo Number of driver directories: %driver_count% >> project_structure.txt
    del temp_count.txt
    
    echo. >> project_structure.txt
    echo Sample drivers (first 5): >> project_structure.txt
    dir /b /a:d drivers | findstr /n "^" | findstr /b "[1-5]" >> project_structure.txt
) else (
    echo Drivers directory not found! >> project_structure.txt
)

echo. >> project_structure.txt
echo Check complete. Results saved to project_structure.txt
type project_structure.txt

pause
