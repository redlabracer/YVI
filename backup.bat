@echo off
:: ===== YVI DATENBANK BACKUP SCRIPT =====
:: Erstellt Backups der SQLite-Datenbank und bereinigt alte Backups.
:: Kann manuell oder als geplante Aufgabe (Windows Task Scheduler) ausgefuehrt werden.

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║               YVI DATENBANK BACKUP SYSTEM                        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: Konfiguration
set BACKUP_DIR=prisma\backups
set DB_FILE=prisma\dev.db
set DOCS_DIR=uploads
set KEEP_DAYS=30

:: Wechsle ins Projektverzeichnis
cd /d "%~dp0"

:: Erstelle Backup-Ordner falls nicht vorhanden
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo [INFO] Backup-Ordner erstellt: %BACKUP_DIR%
)

:: Erstelle Timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

:: ===== DATENBANK BACKUP =====
echo [1/3] Erstelle Datenbank-Backup...
if exist "%DB_FILE%" (
    set DB_BACKUP=%BACKUP_DIR%\dev_%TIMESTAMP%.db
    copy "%DB_FILE%" "%DB_BACKUP%" >nul
    if %errorlevel% equ 0 (
        echo       [OK] Datenbank gesichert: %DB_BACKUP%
        
        :: Zeige Dateigroesse
        for %%A in ("%DB_BACKUP%") do set size=%%~zA
        set /a size_kb=%size% / 1024
        echo       [OK] Groesse: %size_kb% KB
    ) else (
        echo       [FEHLER] Backup fehlgeschlagen!
    )
) else (
    echo       [WARNUNG] Keine Datenbank gefunden: %DB_FILE%
)

:: ===== DOKUMENTE BACKUP (Optional) =====
echo.
echo [2/3] Erstelle Dokumente-Backup...
if exist "%DOCS_DIR%" (
    set DOCS_BACKUP=%BACKUP_DIR%\uploads_%TIMESTAMP%
    xcopy "%DOCS_DIR%" "%DOCS_BACKUP%\" /E /I /Q >nul 2>&1
    if %errorlevel% equ 0 (
        echo       [OK] Dokumente gesichert: %DOCS_BACKUP%
    ) else (
        echo       [WARNUNG] Dokumente-Backup uebersprungen
    )
) else (
    echo       [INFO] Kein Dokumente-Ordner gefunden - ueberspringe
)

:: ===== ALTE BACKUPS BEREINIGEN =====
echo.
echo [3/3] Bereinige alte Backups (aelter als %KEEP_DAYS% Tage)...
set deleted=0
forfiles /P "%BACKUP_DIR%" /M "dev_*.db" /D -%KEEP_DAYS% /C "cmd /c del @path && echo       Geloescht: @file" 2>nul
forfiles /P "%BACKUP_DIR%" /M "uploads_*" /D -%KEEP_DAYS% /C "cmd /c rmdir /s /q @path && echo       Geloescht: @file" 2>nul

:: Zeige verbleibende Backups
echo.
echo ════════════════════════════════════════════════════════════════════
echo Aktuelle Backups im Ordner %BACKUP_DIR%:
echo ════════════════════════════════════════════════════════════════════
dir /B /O-D "%BACKUP_DIR%\dev_*.db" 2>nul | findstr /n "^" | findstr /b "[1-5]:"
echo.
echo Backup abgeschlossen!
echo.

:: Falls als geplante Aufgabe ausgefuehrt, nicht pausieren
if "%1"=="--scheduled" exit /b 0

pause
