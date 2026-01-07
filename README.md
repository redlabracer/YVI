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
