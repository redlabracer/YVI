@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
echo --- YVI Server Update System ---
echo.

:: ===== SICHERHEITS-BACKUP VOR UPDATE =====
echo 0. Erstelle Sicherheits-Backup der Datenbank...
if not exist "prisma\backups" mkdir "prisma\backups"

:: Erstelle Backup mit Datum und Uhrzeit
set backup_name=dev_backup_%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db
set backup_name=%backup_name: =0%

if exist "prisma\dev.db" (
    copy "prisma\dev.db" "prisma\backups\!backup_name!" >nul
    if !errorlevel! equ 0 (
        echo    [OK] Backup erstellt: prisma\backups\!backup_name!
    ) else (
        echo    [WARNUNG] Backup konnte nicht erstellt werden!
        set /p "continue_choice=Moechten Sie trotzdem fortfahren? (J/N): "
        if /i not "!continue_choice!"=="J" exit /b 1
    )
) else (
    echo    [INFO] Keine bestehende Datenbank gefunden - ueberspringe Backup
)
echo.

echo 1. Hole Code von GitHub...
git checkout package-lock.json 2>nul
git pull
if %errorlevel% neq 0 (
    echo Fehler beim Git Pull!
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Installiere neue Pakete...
call npm install
if %errorlevel% neq 0 (
    echo Fehler bei npm install!
    pause
    exit /b %errorlevel%
)

echo.
echo 3. Datenbank Updates...
set PRISMA_CLIENT_ENGINE_TYPE=binary
set PRISMA_CLI_QUERY_ENGINE_TYPE=binary
echo    Generiere Prisma Client...
cmd /c "npx prisma generate 2>&1" | findstr /v "^$"
if %errorlevel% neq 0 (
    echo    [WARNUNG] Prisma Generate hatte Warnungen - fahre fort...
)
echo    Fuehre Migrationen aus...
cmd /c "npx prisma migrate deploy 2>&1" | findstr /v "^$"
if %errorlevel% neq 0 (
    echo    [WARNUNG] Prisma Migrate hatte Warnungen - fahre fort...
)

echo.
echo 4. Baue App neu...
call npm run build
if %errorlevel% neq 0 (
    echo Fehler beim Build!
    pause
    exit /b %errorlevel%
)

echo.
echo === Update erfolgreich abgeschlossen! ===
echo.
echo 5. Starte Server...
echo Druecken Sie STRG+C zum Beenden.
call npm run serve
