# YVI Werkstatt - Installation & Updates

## 📥 Erstinstallation auf Client-PCs

### Schritt 1: Installer erstellen (auf dem Entwicklungs-PC)
```cmd
build-installer.bat
```
Dies erstellt:
- `dist/YVI Werkstatt-Setup-X.X.X.exe` - Der Installer
- `updates/` - Update-Dateien für den Server

### Schritt 2: Installer auf Client-PCs ausführen
1. Kopieren Sie die `.exe` Datei auf einen USB-Stick oder Netzlaufwerk
2. Auf jedem Client-PC: Doppelklick auf `YVI Werkstatt-Setup-X.X.X.exe`
3. Installationsassistent folgen

### Schritt 3: Server-Verbindung einrichten
1. App starten
2. Einstellungen öffnen
3. Server-URL eintragen: `http://192.168.0.250:3000` (oder Ihre IP)
4. Speichern

---

## 🔄 Automatische Updates

### Wie funktioniert es?
1. Bei jedem App-Start wird geprüft, ob ein Update verfügbar ist
2. Updates werden im Hintergrund heruntergeladen
3. Nach dem Download erscheint ein Dialog: "Update bereit - Jetzt neu starten?"
4. Bei "Ja" wird die App neu gestartet mit der neuen Version

### Update veröffentlichen (auf dem Server)
1. Version in `package.json` erhöhen:
   ```json
   "version": "1.0.1"
   ```
2. `build-installer.bat` ausführen
3. Die Dateien in `updates/` werden automatisch vom Server bereitgestellt
4. Client-Apps erhalten das Update beim nächsten Start

---

## 📁 Ordnerstruktur

```
YVI/
├── dist/                    # Erstellte Installer
│   └── YVI Werkstatt-Setup-1.0.0.exe
├── updates/                 # Update-Dateien (Server)
│   ├── latest.yml          # Update-Info
│   ├── YVI Werkstatt-Setup-1.0.0.exe
│   └── *.blockmap          # Delta-Update-Daten
├── prisma/
│   ├── dev.db              # Datenbank
│   └── backups/            # Automatische Backups
└── uploads/                 # Hochgeladene Dokumente
```

---

## 🛠️ Manuelle Update-Prüfung

In der App können Benutzer manuell nach Updates suchen:
- Einstellungen → "Nach Updates suchen"

Oder per IPC (für Entwickler):
```javascript
await window.electron.ipcRenderer.invoke('check-for-updates')
await window.electron.ipcRenderer.invoke('get-app-version')
await window.electron.ipcRenderer.invoke('install-update')
```

---

## ⚙️ Konfiguration

### Update-Server ändern
In `electron-builder.yml`:
```yaml
publish:
  provider: generic
  url: https://app.werkstatt-terhaag.uk/updates
```

### Lokaler Server (Intranet)
Wenn Sie keinen externen Server haben:
```yaml
publish:
  provider: generic
  url: http://192.168.0.250:3000/updates
```

---

## ❓ Fehlerbehebung

### "Update-Prüfung fehlgeschlagen"
- Prüfen Sie die Netzwerkverbindung zum Server
- Stellen Sie sicher, dass der Server läuft (`npm run serve`)
- Prüfen Sie, ob `updates/latest.yml` existiert

### "Installation fehlgeschlagen"
- Führen Sie den Installer als Administrator aus
- Deinstallieren Sie alte Versionen zuerst
- Prüfen Sie den Virenscanner

### App startet nicht nach Update
1. Deinstallieren über Windows Einstellungen
2. Neu installieren mit dem neuesten Installer
