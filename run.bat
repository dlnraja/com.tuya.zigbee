@echo off
echo.
echo ========================================
echo Running: %*
echo ========================================
echo.
%*
echo.
echo ========================================
echo Command completed
echo ========================================
echo.
echo.
echo.
exit /b %ERRORLEVEL%
