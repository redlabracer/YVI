# KFZ Werkstatt Manager

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
