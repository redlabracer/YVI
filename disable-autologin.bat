@echo off
:: ===================================================
:: YVI Server Auto-Login Deaktivierung
:: MUSS ALS ADMINISTRATOR AUSGEFÜHRT WERDEN!
:: ===================================================

echo --- YVI Auto-Login Deaktivierung ---
echo.

:: Prüfe auf Administrator-Rechte
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Dieses Script muss als Administrator ausgefuehrt werden!
    echo Rechtsklick auf die Datei -^> "Als Administrator ausfuehren"
    pause
    exit /b 1
)

echo Deaktiviere Auto-Login...

:: Entferne Auto-Login Einstellungen
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 0 /f
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword /f 2>nul

echo [OK] Auto-Login deaktiviert

echo.
echo Entferne Autostart-Verknuepfung...

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\YVI-Server.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo [OK] Autostart-Verknuepfung entfernt
) else (
    echo [INFO] Keine Autostart-Verknuepfung gefunden
)

set "SCRIPT_DIR=%~dp0"
set "STARTUP_SCRIPT=%SCRIPT_DIR%yvi-autostart.vbs"

if exist "%STARTUP_SCRIPT%" (
    del "%STARTUP_SCRIPT%"
    echo [OK] Auto-Start Script entfernt
)

echo.
echo === Auto-Login und Auto-Start wurden deaktiviert ===
echo.
pause
