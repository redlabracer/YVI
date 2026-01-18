# KFZ Werkstatt Manager

Eine moderne Desktop-Anwendung für KFZ-Werkstätten zur Verwaltung von Kunden, Fahrzeugen, Terminen und Dokumenten.

## Features
- **Dashboard**: Übersicht über anstehende Termine und Statistiken.
- **Kundenverwaltung**: Anlegen und Verwalten von Kunden und deren Fahrzeugen.
- **Fahrzeugschein-Scanner**: Automatische Datenerfassung per Handy-Upload (QR-Code) und KI-Analyse.
- **Kalender**: Terminplanung mit Drag & Drop, Feiertagen und Betriebsferien.
- **Leistungs-Vorlagen**: Textbausteine für häufige Arbeiten.
- **Lexware Integration**: Synchronisation von Kunden und Rechnungen.
- **Modernes UI**: Clean Design, Dark Mode Support.
- **Multi-Client Synchronisation**: Zentrale Datenbank mit Web- und Desktop-Zugriff.

## Architektur

### Client-Server Modus (Empfohlen für mehrere Arbeitsplätze)

Die App unterstützt zwei Betriebsmodi:

1. **Standalone-Modus** (Standard): Die Desktop-App nutzt eine lokale SQLite-Datenbank.
2. **Server-Modus**: Alle Clients (Desktop + Web) verbinden sich mit einem zentralen Server.

#### Server einrichten (auf dem Hauptrechner)
```bash
# Server starten (läuft auf Port 3000)
node dist/server/index.js
# Oder für Entwicklung:
npx ts-node src/server/index.ts
```

Der Server ist dann erreichbar unter:
- Lokal: http://localhost:3000
- Netzwerk: http://192.168.0.250:3000 (IP anpassen)
- Internet: https://app.werkstatt-terhaag.uk (wenn konfiguriert)

#### Clients verbinden

1. Öffnen Sie die Desktop-App oder den Browser (http://192.168.0.250:3000)
2. Gehen Sie zu **Einstellungen** → **Cloud / Remote Database**
3. Aktivieren Sie **"Remote-Server verwenden"**
4. Geben Sie die Server-URL ein: `http://192.168.0.250:3000`
5. Klicken Sie auf **"Speichern & Neustarten"**

> **Wichtig**: Alle Clients müssen dieselbe Server-URL verwenden, damit sie synchronisiert sind!

#### Zugangsdaten
Standard-Login (Basic Auth):
- Benutzer: `Terhaag`
- Passwort: `terhaag`

Diese können in den Umgebungsvariablen `AUTH_USER` und `AUTH_PASS` angepasst werden.

## Voraussetzungen
- Node.js (v18 oder höher)
- npm (wird mit Node.js installiert)

## Installation
1. Öffnen Sie ein Terminal in diesem Ordner.
2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Generieren Sie den Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Erstellen Sie die Datenbank:
   ```bash
   npx prisma db push
   ```

## Starten
Starten Sie die Anwendung im Entwicklungsmodus:
```bash
npm run dev
```

## Bauen (für Produktion)
Erstellen Sie eine installierbare Datei (.exe):
```bash
npm run build:win
```
