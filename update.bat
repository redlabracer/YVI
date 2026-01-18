@echo off
echo --- YVI Server Update System ---
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
