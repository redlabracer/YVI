@echo off
:: ===== PRISMA SICHERHEITS-WRAPPER =====
:: Dieses Script faengt gefaehrliche Prisma-Befehle ab und zeigt eine Warnung an.
:: Verwenden Sie dieses Script anstelle von "npx prisma" direkt.

set "args=%*"

:: Pruefe auf gefaehrliche Befehle
echo %args% | findstr /i "migrate reset" >nul
if %errorlevel% equ 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║  ██████╗ ███████╗███████╗██████╗ ███████╗██████╗ ██████╗ ████████╗║
    echo ║ ██╔════╝ ██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝║
    echo ║ ██║  ███╗█████╗  ███████╗██████╔╝█████╗  ██████╔╝██████╔╝   ██║   ║
    echo ║ ██║   ██║██╔══╝  ╚════██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██╗   ██║   ║
    echo ║ ╚██████╔╝███████╗███████║██║     ███████╗██║  ██║██║  ██║   ██║   ║
    echo ║  ╚═════╝ ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ║
    echo ╠══════════════════════════════════════════════════════════════════╣
    echo ║                                                                  ║
    echo ║  BEFEHL GESPERRT: prisma migrate reset                           ║
    echo ║                                                                  ║
    echo ║  GRUND: Dieser Befehl LOESCHT ALLE DATEN in der Datenbank        ║
    echo ║         und setzt sie komplett zurueck!                          ║
    echo ║                                                                  ║
    echo ║  Dies wuerde folgende Daten unwiderruflich loeschen:             ║
    echo ║    - Alle Kunden                                                 ║
    echo ║    - Alle Fahrzeuge                                              ║
    echo ║    - Alle Termine                                                ║
    echo ║    - Alle Service-Historien                                      ║
    echo ║    - Alle Dokumente                                              ║
    echo ║    - Alle Einstellungen                                          ║
    echo ║                                                                  ║
    echo ║  ALTERNATIVE: Verwenden Sie "prisma migrate deploy"              ║
    echo ║               um Migrationen sicher anzuwenden.                  ║
    echo ║                                                                  ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    echo.
    exit /b 1
)

echo %args% | findstr /i "db push.*force-reset" >nul
if %errorlevel% equ 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                      BEFEHL GESPERRT                             ║
    echo ╠══════════════════════════════════════════════════════════════════╣
    echo ║                                                                  ║
    echo ║  BEFEHL: prisma db push --force-reset                            ║
    echo ║                                                                  ║
    echo ║  GRUND: Dieser Befehl LOESCHT ALLE DATEN und erstellt            ║
    echo ║         die Datenbank-Tabellen komplett neu!                     ║
    echo ║                                                                  ║
    echo ║  ALTERNATIVE: Verwenden Sie "prisma db push" ohne --force-reset  ║
    echo ║               oder "prisma migrate deploy" fuer sichere Updates. ║
    echo ║                                                                  ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    echo.
    exit /b 1
)

echo %args% | findstr /i "migrate dev" >nul
if %errorlevel% equ 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                      WARNUNG                                     ║
    echo ╠══════════════════════════════════════════════════════════════════╣
    echo ║                                                                  ║
    echo ║  BEFEHL: prisma migrate dev                                      ║
    echo ║                                                                  ║
    echo ║  HINWEIS: Dieser Befehl ist nur fuer ENTWICKLUNG gedacht!        ║
    echo ║           Auf dem Produktions-Server verwenden Sie bitte:        ║
    echo ║           "prisma migrate deploy"                                ║
    echo ║                                                                  ║
    echo ║  Moechten Sie trotzdem fortfahren? (J/N)                         ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    set /p continue=
    if /i not "%continue%"=="J" exit /b 1
)

:: Befehl ist sicher - ausfuehren
call npx prisma %*
