# Update Script für Thin Client Server
# Ausführen mit Rechtsklick -> "Mit PowerShell ausführen"

Write-Host "🔄 YVI Server Update System" -ForegroundColor Cyan
Write-Host "--------------------------------"

# 1. Neuesten Code holen
Write-Host "📥 Hole Änderungen von GitHub..." -ForegroundColor Yellow
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Fehler beim Git Pull. Bitte Internetverbindung prüfen." -ForegroundColor Red
    Read-Host "Drücken Sie Enter zum Beenden..."
    exit
}

# 2. Abhängigkeiten installieren
Write-Host "📦 Prüfe auf neue Pakete (npm install)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Fehler bei npm install." -ForegroundColor Red
    Read-Host "Drücken Sie Enter zum Beenden..."
    exit
}

# 3. Datenbank aktualisieren
Write-Host "🗄️  Prüfe Datenbank-Updates..." -ForegroundColor Yellow
# Erzwinge Binary Mode für den Thin Client
$env:PRISMA_CLIENT_ENGINE_TYPE="binary"
$env:PRISMA_CLI_QUERY_ENGINE_TYPE="binary"
npx prisma generate
npx prisma migrate deploy

# 4. App neu bauen (Frontend)
Write-Host "🔨 Baue neue Version der Oberfläche..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Fehler beim Build." -ForegroundColor Red
    Read-Host "Drücken Sie Enter zum Beenden..."
    exit
}

# 5. Server starten
Write-Host "Update erfolgreich!" -ForegroundColor Green
Write-Host "Starte Server..." -ForegroundColor Green
Write-Host "--------------------------------"
Write-Host "Druecken Sie jetzt STRG+C um den Server zu stoppen."

npm run serve
