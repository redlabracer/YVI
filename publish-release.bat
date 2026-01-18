@echo off
:: ===== YVI RELEASE AUF GITHUB VEROEFFENTLICHEN =====
setlocal enabledelayedexpansion

echo ========================================================================
echo         YVI GITHUB RELEASE VEROEFFENTLICHEN
echo ========================================================================
echo.

cd /d "%~dp0"

:: Token direkt setzen (aus Registry lesen)
for /f "tokens=3" %%a in ('reg query "HKCU\Environment" /v GH_TOKEN 2^>nul ^| find "GH_TOKEN"') do set "GH_TOKEN=%%a"

if "!GH_TOKEN!"=="" (
    echo [FEHLER] GitHub Token nicht gefunden!
    echo.
    echo Bitte fuehren Sie zuerst aus:
    echo    setx GH_TOKEN "ghp_IhrTokenHier"
    echo.
    pause
    exit /b 1
)

echo [OK] GitHub Token gefunden
echo.

:: Version aus package.json lesen
for /f "usebackq tokens=2 delims=:," %%a in (`type package.json ^| findstr /c:"version"`) do (
    set "VERSION=%%~a"
    goto :got_version
)
:got_version
set "VERSION=!VERSION: =!"
set "VERSION=!VERSION:"=!"

echo Aktuelle Version: !VERSION!
echo.

:: Prüfe ob Tag bereits existiert
git tag 2>nul | findstr /x "v!VERSION!" >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARNUNG] Version v!VERSION! existiert bereits auf GitHub!
    echo Bitte erhoehen Sie die Version in package.json
    echo.
    pause
    exit /b 1
)

echo [1/4] Aenderungen committen...
git add -A
git commit -m "Release v!VERSION!" 2>nul
if !errorlevel! equ 0 (
    echo       Commit erstellt
) else (
    echo       Keine Aenderungen zu committen
)

echo.
echo [2/4] Git Tag erstellen...
git tag -a "v!VERSION!" -m "Version !VERSION!"
git push origin main --tags
echo       Tag v!VERSION! erstellt und gepusht

echo.
echo [3/4] Code kompilieren...
call npm run build
if !errorlevel! neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b !errorlevel!
)

echo.
echo [4/4] Installer erstellen und auf GitHub hochladen...
call npx electron-builder --win --publish always
if !errorlevel! neq 0 (
    echo [FEHLER] Upload fehlgeschlagen!
    pause
    exit /b !errorlevel!
)

echo.
echo ========================================================================
echo                       ERFOLGREICH!
echo ========================================================================
echo.
echo   Version !VERSION! wurde auf GitHub veroeffentlicht!
echo.
echo   Download-Link:
echo   https://github.com/redlabracer/YVI/releases/latest
echo.
echo   Alle Clients mit installierter App erhalten das Update
echo   automatisch beim naechsten Start!
echo.
echo ========================================================================
echo.

pause
