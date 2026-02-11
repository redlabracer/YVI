@echo off
setlocal
chcp 65001 >nul

echo ===================================================
echo   YVI Server Reparatur & Neustart
echo ===================================================
echo.
echo Dieses Script:
echo 1. Beendet alle laufenden Node.js (App) Prozesse
echo 2. Startet den Cloudflare Tunnel Dienst neu
echo 3. Startet den YVI Server neu (via update.bat)
echo.

:: Prüfe auf Administrator-Rechte
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Bitte als Administrator ausfuehren!
    echo Rechtsklick auf die Datei -^> "Als Administrator ausfuehren"
    pause
    exit /b 1
)

echo [1/4] Beende laufende App-Prozesse...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Prozesse beendet.
) else (
    echo    [INFO] Keine laufenden Prozesse gefunden.
)

echo.
echo [2/4] Starte Cloudflare Tunnel neu...
:: Versuche Dienst neu zu starten
sc query "cloudflared" >nul 2>&1
if %errorlevel% equ 0 (
    net stop cloudflared >nul 2>&1
    net start cloudflared
    if %errorlevel% equ 0 (
        echo    [OK] Cloudflare Dienst neu gestartet.
    ) else (
        echo    [FEHLER] Konnte Cloudflare Dienst nicht starten.
        echo    Bitte prüfen Sie, ob der Dienst 'cloudflared' installiert ist.
    )
) else (
    echo    [WARNUNG] Cloudflare Dienst nicht gefunden.
    echo    Überspringe Dienst-Neustart.
)

echo.
echo [3/4] Lösche temporäre Dateien...
if exist "out\*" del /q "out\*" >nul 2>&1

echo.
echo [4/4] Starte YVI Server...
start "YVI Server" cmd /c "update.bat"

echo.
echo ===================================================
echo   Reparatur abgeschlossen!
echo   Das Server-Fenster sollte sich geoeffnet haben.
echo   Bitte warten Sie ca. 1-2 Minuten bis die App erreichbar ist.
echo ===================================================
pause
