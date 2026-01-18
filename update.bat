@echo off
echo --- YVI Server Update System ---
echo.

:: ===== SICHERHEITS-BACKUP VOR UPDATE =====
echo 0. Erstelle Sicherheits-Backup der Datenbank...
if not exist "prisma\backups" mkdir "prisma\backups"

:: Erstelle Backup mit Datum und Uhrzeit
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set backup_name=dev_backup_%datetime:~0,8%_%datetime:~8,6%.db

if exist "prisma\dev.db" (
    copy "prisma\dev.db" "prisma\backups\%backup_name%" >nul
    if %errorlevel% equ 0 (
        echo    [OK] Backup erstellt: prisma\backups\%backup_name%
    ) else (
        echo    [WARNUNG] Backup konnte nicht erstellt werden!
        echo    Moechten Sie trotzdem fortfahren? (J/N)
        set /p continue=
        if /i not "%continue%"=="J" exit /b 1
    )
) else (
    echo    [INFO] Keine bestehende Datenbank gefunden - ueberspringe Backup
)
echo.

echo 1. Hole Code von GitHub...
git checkout package-lock.json
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
call npx prisma generate
call npx prisma migrate deploy

echo.
echo 4. Baue App neu...
call npm run build
if %errorlevel% neq 0 (
    echo Fehler beim Build!
    pause
    exit /b %errorlevel%
)

echo.
echo 5. Starte Server...
echo Druecken Sie STRG+C zum Beenden.
call npm run serve
