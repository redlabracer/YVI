@echo off
:: ===================================================
:: YVI Server Auto-Start Setup
:: Konfiguriert Windows Auto-Login und Auto-Start
:: MUSS ALS ADMINISTRATOR AUSGEFÜHRT WERDEN!
:: ===================================================

echo --- YVI Server Auto-Start Setup ---
echo.
echo WARNUNG: Dieses Script konfiguriert:
echo   1. Automatische Windows-Anmeldung (Passwort: 2007)
echo   2. Automatischer Start des YVI Servers nach Anmeldung
echo.
echo SICHERHEITSHINWEIS: Auto-Login speichert das Passwort in der Registry!
echo.

:: Prüfe auf Administrator-Rechte
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Dieses Script muss als Administrator ausgefuehrt werden!
    echo Rechtsklick auf die Datei -^> "Als Administrator ausfuehren"
    pause
    exit /b 1
)

set /p "confirm=Moechten Sie fortfahren? (J/N): "
if /i not "%confirm%"=="J" (
    echo Abgebrochen.
    pause
    exit /b 0
)

echo.
echo ========================================
echo 1. Konfiguriere Auto-Login...
echo ========================================

:: Hole den aktuellen Benutzernamen
set "USERNAME_VAL=%USERNAME%"

:: Konfiguriere Auto-Login in der Registry
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName /t REG_SZ /d "%USERNAME_VAL%" /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword /t REG_SZ /d "2007" /f

if %errorlevel% equ 0 (
    echo [OK] Auto-Login fuer Benutzer "%USERNAME_VAL%" konfiguriert
) else (
    echo [FEHLER] Auto-Login konnte nicht konfiguriert werden!
)

echo.
echo ========================================
echo 2. Erstelle Auto-Start Script...
echo ========================================

:: Erstelle das Startup-Script
set "SCRIPT_DIR=%~dp0"
set "STARTUP_SCRIPT=%SCRIPT_DIR%yvi-autostart.vbs"

:: Erstelle VBS Script (startet ohne sichtbares CMD-Fenster, dann öffnet sich das Fenster vom Server)
echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_SCRIPT%"
echo WshShell.CurrentDirectory = "%SCRIPT_DIR:~0,-1%" >> "%STARTUP_SCRIPT%"
echo WshShell.Run "cmd /c ""%SCRIPT_DIR%update.bat""", 1, False >> "%STARTUP_SCRIPT%"

if exist "%STARTUP_SCRIPT%" (
    echo [OK] Auto-Start Script erstellt: %STARTUP_SCRIPT%
) else (
    echo [FEHLER] Auto-Start Script konnte nicht erstellt werden!
)

echo.
echo ========================================
echo 3. Erstelle Autostart-Verknuepfung...
echo ========================================

:: Erstelle Verknüpfung im Autostart-Ordner
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\YVI-Server.lnk"

:: PowerShell verwenden um Verknüpfung zu erstellen
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%STARTUP_SCRIPT%'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR:~0,-1%'; $Shortcut.Description = 'YVI Server Auto-Start'; $Shortcut.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Autostart-Verknuepfung erstellt: %SHORTCUT%
) else (
    echo [FEHLER] Verknuepfung konnte nicht erstellt werden!
)

echo.
echo ========================================
echo Setup abgeschlossen!
echo ========================================
echo.
echo Nach einem Neustart wird:
echo   1. Windows sich automatisch anmelden (Benutzer: %USERNAME_VAL%)
echo   2. Der YVI Server automatisch starten
echo.
echo Um Auto-Login zu deaktivieren, fuehren Sie "disable-autologin.bat" aus.
echo.
pause
