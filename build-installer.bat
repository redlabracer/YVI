@echo off
:: ===== YVI INSTALLER & UPDATE ERSTELLEN =====
:: Erstellt Windows Installer (.exe) und lädt auf GitHub hoch

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║           YVI INSTALLER ERSTELLEN                                 ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Aktuelle Version aus package.json lesen
for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\"" package.json') do set VERSION=%%~a
echo Aktuelle Version: %VERSION%
echo.

echo [1/3] Code kompilieren...
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Windows Installer erstellen...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [FEHLER] Installer-Erstellung fehlgeschlagen!
    pause
    exit /b %errorlevel%
)

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                      FERTIG!                                     ║
echo ╠══════════════════════════════════════════════════════════════════╣
echo ║                                                                  ║
echo ║  Installer erstellt in: dist\                                    ║
echo ║                                                                  ║
echo ║  Naechste Schritte:                                              ║
echo ║  1. Auf GitHub ein neues Release erstellen                       ║
echo ║  2. Die Dateien aus dist\ hochladen:                             ║
echo ║     - YVI Werkstatt-Setup-X.X.X.exe                              ║
echo ║     - latest.yml                                                 ║
echo ║                                                                  ║
echo ║  ODER automatisch mit: publish-release.bat                       ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: Zeige erstellte Dateien
echo Erstellte Dateien:
dir /B "dist\*.exe" 2>nul
dir /B "dist\latest.yml" 2>nul
echo.

pause
echo.

:: Zeige erstellte Dateien
echo Erstellte Dateien:
dir /B "dist\*.exe" 2>nul
echo.

pause
