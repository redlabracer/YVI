@echo off
:: ===== AUTOMATISCHES BACKUP EINRICHTEN =====
:: Erstellt eine Windows-Aufgabe fuer taegliche Backups um 03:00 Uhr

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║         AUTOMATISCHES BACKUP EINRICHTEN                          ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo Dieses Script erstellt eine Windows-Aufgabe, die taeglich um 03:00 Uhr
echo automatisch ein Backup der Datenbank erstellt.
echo.
echo HINWEIS: Dieses Script muss als Administrator ausgefuehrt werden!
echo.
pause

:: Pruefe Admin-Rechte
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Bitte fuehren Sie dieses Script als Administrator aus!
    echo          Rechtsklick ^> "Als Administrator ausfuehren"
    pause
    exit /b 1
)

:: Erstelle die geplante Aufgabe
set TASK_NAME=YVI_Datenbank_Backup
set SCRIPT_PATH=%~dp0backup.bat

schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\" --scheduled" /sc daily /st 03:00 /ru SYSTEM /f

if %errorlevel% equ 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                      ERFOLGREICH!                                ║
    echo ╠══════════════════════════════════════════════════════════════════╣
    echo ║                                                                  ║
    echo ║  Geplante Aufgabe erstellt: %TASK_NAME%                          ║
    echo ║  Ausfuehrung: Taeglich um 03:00 Uhr                              ║
    echo ║  Backup-Ordner: prisma\backups                                   ║
    echo ║  Aufbewahrung: 30 Tage                                           ║
    echo ║                                                                  ║
    echo ║  Zum Deaktivieren:                                               ║
    echo ║  schtasks /delete /tn "%TASK_NAME%" /f                           ║
    echo ║                                                                  ║
    echo ╚══════════════════════════════════════════════════════════════════╝
) else (
    echo.
    echo [FEHLER] Konnte geplante Aufgabe nicht erstellen!
)

echo.
pause
