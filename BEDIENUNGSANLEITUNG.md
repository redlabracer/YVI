# 📖 Bedienungsanleitung - KFZ Werkstatt Manager

## Inhaltsverzeichnis

1. [Einführung](#1-einführung)
2. [Erste Schritte](#2-erste-schritte)
3. [Dashboard (Startseite)](#3-dashboard-startseite)
4. [Kundenverwaltung](#4-kundenverwaltung)
5. [Fahrzeugverwaltung](#5-fahrzeugverwaltung)
6. [Terminkalender](#6-terminkalender)
7. [Reifenlager](#7-reifenlager)
8. [Leistungs-Vorlagen](#8-leistungs-vorlagen)
9. [Aufgabenliste (ToDo)](#9-aufgabenliste-todo)
10. [Lexware-Integration](#10-lexware-integration)
11. [Conrad (Carparts) Integration](#11-conrad-carparts-integration)
12. [Massen-Import](#12-massen-import)
13. [Einstellungen](#13-einstellungen)
14. [Mobile Funktionen](#14-mobile-funktionen)
15. [Tastenkombinationen & Tipps](#15-tastenkombinationen--tipps)
16. [Fehlerbehebung](#16-fehlerbehebung)

---

## 1. Einführung

Der **KFZ Werkstatt Manager** ist eine moderne Desktop-Anwendung zur Verwaltung Ihrer KFZ-Werkstatt. Die Software ermöglicht:

- 👥 **Kundenverwaltung** mit vollständiger Fahrzeughistorie
- 🚗 **Fahrzeugverwaltung** mit KI-gestützter Fahrzeugschein-Erkennung
- 📅 **Terminkalender** mit Feiertagen und Betriebsurlaub
- 🔧 **Reifenlager-Verwaltung** mit visueller Lagerplatzkarte
- 📝 **Leistungs-Vorlagen** für wiederkehrende Arbeiten
- 💼 **Lexware-Integration** für Buchhaltung
- 🔗 **Multi-Client-Synchronisation** für mehrere Arbeitsplätze

---

## 2. Erste Schritte

### 2.1 Anmeldung

Bei Verwendung des Remote-Servers:
- **Benutzer:** `Terhaag`
- **Passwort:** `terhaag`

### 2.2 Betriebsmodi

Die App unterstützt zwei Modi:

| Modus | Beschreibung |
|-------|--------------|
| **Standalone** | Lokale SQLite-Datenbank auf Ihrem Computer |
| **Server-Modus** | Zentrale Datenbank für mehrere Arbeitsplätze |

### 2.3 Server-Modus einrichten

1. Gehen Sie zu **Einstellungen** → **Cloud / Remote Database**
2. Aktivieren Sie **"Remote-Server verwenden"**
3. Geben Sie die Server-URL ein (z.B. `http://192.168.0.250:3000`)
4. Klicken Sie auf **"Speichern & Neustarten"**

---

## 3. Dashboard (Startseite)

Das Dashboard ist Ihre zentrale Anlaufstelle und zeigt:

### 3.1 Übersicht

- **Aktuelle Datum** und Wochentag
- **Heutige Termine** mit Status
- **Aufgabenliste** (ToDo's)

### 3.2 Schnellzugriff-Buttons

| Button | Funktion |
|--------|----------|
| **🆕 Neuaufnahme** | Neuen Kunden oder Fahrzeug für Bestandskunden anlegen |
| **👥 Kundenstamm** | Alle Kunden anzeigen |
| **💼 Lexware** | Lexware Dashboard öffnen |
| **⚙️ Einstellungen** | App-Konfiguration |

### 3.3 Termine auf dem Dashboard

- Termine werden nach Status farblich markiert:
  - 🔘 **Grau** = Offen
  - 🔵 **Blau** = In Arbeit
  - 🟢 **Grün** = Fertig
  - 🟣 **Lila** = Abgeholt

- Klicken Sie auf einen Termin, um Details anzuzeigen
- Über **"Als erledigt markieren"** können Sie Termine abschließen

---

## 4. Kundenverwaltung

### 4.1 Kundenliste öffnen

1. Klicken Sie auf **"Kundenstamm"** im Dashboard oder in der Seitenleiste

### 4.2 Kunde suchen

1. Geben Sie im Suchfeld Name oder Telefonnummer ein
2. Die Liste filtert sich automatisch

### 4.3 Neuen Kunden anlegen

1. Klicken Sie auf **"Neuer Kunde"**
2. Füllen Sie das Formular aus:
   - **Vorname** (Pflichtfeld)
   - **Nachname** (Pflichtfeld)
   - **Adresse**
   - **Telefon**
   - **E-Mail**
3. Fügen Sie optional direkt ein Fahrzeug hinzu
4. Klicken Sie auf **"Speichern"**

#### Fahrzeugschein scannen (bei Neukundenanlage)

1. Wählen Sie **"Datei auswählen"** oder nutzen Sie **"Handy-Upload"**
2. Laden Sie ein Foto des Fahrzeugscheins hoch
3. Klicken Sie auf **"Mit KI analysieren"** 🪄
4. Die Fahrzeugdaten werden automatisch ausgefüllt

> 💡 **Tipp:** Aktivieren Sie **"Auch Kundendaten aus Fahrzeugschein auslesen"** um Name und Adresse automatisch zu übernehmen.

### 4.4 Kundendetails anzeigen/bearbeiten

1. Klicken Sie auf einen Kunden in der Liste
2. Sie sehen drei Tabs:
   - **Fahrzeuge** - Alle Fahrzeuge des Kunden
   - **Historie** - Werkstatt-Historie
   - **Dokumente** - Hochgeladene Dateien

#### Kundendaten bearbeiten

1. Klicken Sie auf **"Bearbeiten"** (Stift-Symbol)
2. Ändern Sie die gewünschten Daten
3. Klicken Sie auf **"Speichern"**

### 4.5 Kunden zusammenführen (Duplikate)

Falls ein Kunde doppelt angelegt wurde:

1. Öffnen Sie die Kundendetails des zu löschenden Kunden
2. Klicken Sie auf **👥 "Zusammenführen"**
3. Suchen Sie den Zielkunden
4. Bestätigen Sie die Zusammenführung

> ⚠️ **Hinweis:** Alle Fahrzeuge, Dokumente und Historie werden zum Zielkunden übertragen. Der ursprüngliche Kunde wird gelöscht.

### 4.6 Kunde löschen

1. Öffnen Sie die Kundendetails
2. Klicken Sie auf **"Löschen"** (Papierkorb-Symbol)
3. Bestätigen Sie die Löschung

---

## 5. Fahrzeugverwaltung

### 5.1 Fahrzeug zu Kunde hinzufügen

1. Öffnen Sie die Kundendetails
2. Wechseln Sie zum Tab **"Fahrzeuge"**
3. Klicken Sie auf **"+ Fahrzeug hinzufügen"**
4. Füllen Sie die Fahrzeugdaten aus:

| Feld | Beschreibung |
|------|--------------|
| **Marke** | z.B. VW, BMW, Mercedes |
| **Modell** | z.B. Golf, 3er, A-Klasse |
| **Kennzeichen** | z.B. B-AB 1234 |
| **FIN/VIN** | 17-stellige Fahrzeug-Identnummer |
| **HSN** | 4-stellige Herstellerschlüsselnummer |
| **TSN** | 3-stellige Typschlüsselnummer |
| **Erstzulassung** | Datum der Erstzulassung |
| **Kilometerstand** | Aktueller km-Stand |
| **Kraftstoff** | Benzin, Diesel, Elektro, etc. |
| **Getriebe** | Manuell, Automatik |

#### Fahrzeugschein mit KI analysieren

1. Klicken Sie auf **"Datei auswählen"** oder **"Handy-Upload"** 📱
2. Laden Sie ein Foto des Fahrzeugscheins hoch
3. Klicken Sie auf **🪄 "Mit KI analysieren"**
4. Die Daten werden automatisch eingetragen

### 5.2 Fahrzeug bearbeiten

1. Klicken Sie bei einem Fahrzeug auf **"Bearbeiten"**
2. Ändern Sie die Daten
3. Klicken Sie auf **"Speichern"**

### 5.3 Fahrzeug zu anderem Kunden übertragen

1. Klicken Sie bei einem Fahrzeug auf **↔️ "Übertragen"**
2. Suchen Sie den Zielkunden
3. Bestätigen Sie die Übertragung

### 5.4 Fahrzeug löschen

1. Klicken Sie auf das **Papierkorb-Symbol**
2. Bestätigen Sie die Löschung

---

## 6. Terminkalender

### 6.1 Kalender öffnen

Klicken Sie auf **"Kalender"** in der Seitenleiste

### 6.2 Kalenderansicht

- **Monatsansicht** mit allen Terminen
- **Navigation:** Pfeile links/rechts zum Monatswechsel
- **Farbcodes:**
  - 🟢 **Grün** = Feiertage
  - 🔴 **Rot** = Betriebsurlaub/Geschlossen
  - 🔵 **Blau Markierung** = Heute

### 6.3 Termin erstellen

**Methode 1: Über Kalender**
1. Klicken Sie auf einen Tag im Kalender
2. Das Termin-Formular öffnet sich

**Methode 2: Über Button**
1. Klicken Sie auf **"+ Neuer Termin"**
2. Das Formular öffnet sich mit dem heutigen Datum

### 6.4 Termin-Formular ausfüllen

| Feld | Beschreibung |
|------|--------------|
| **Vorlage** | Leistungs-Vorlage auswählen (optional) |
| **Titel** | Kurzbeschreibung des Termins |
| **Von / Bis** | Datum und Uhrzeit |
| **Kunde** | Kunde auswählen (Dropdown) |
| **Fahrzeug** | Fahrzeug des Kunden auswählen |
| **Status** | Offen, In Arbeit, Fertig, Abgeholt |
| **Beschreibung** | Detaillierte Beschreibung |

> 💡 **Tipp:** Wenn Sie eine Vorlage auswählen, werden Titel und Beschreibung automatisch ausgefüllt.

### 6.5 Termin abschließen

1. Öffnen Sie den Termin
2. Klicken Sie auf **"Abschließen"**
3. Geben Sie optional den aktuellen Kilometerstand ein
4. Bestätigen Sie

> Der Termin wird automatisch in die Werkstatt-Historie des Kunden übernommen.

### 6.6 Termin bearbeiten/löschen

1. Klicken Sie auf einen Termin im Kalender
2. Bearbeiten Sie die Daten oder klicken Sie auf **"Löschen"**

### 6.7 Betriebsurlaub eintragen

1. Klicken Sie auf **"Urlaub eintragen"**
2. Wählen Sie Start- und Enddatum
3. Geben Sie optional eine Beschreibung ein
4. Klicken Sie auf **"Speichern"**

> Die Urlaubstage werden rot im Kalender markiert und als "Geschlossen" angezeigt.

---

## 7. Reifenlager

### 7.1 Lagerplan öffnen

Klicken Sie auf **"Reifenlager"** in der Seitenleiste

### 7.2 Lagerplan verstehen

- **Gelb** = Frei
- **Rot** = Belegt
- **Blau** = Reserviert
- **Grau** = Gesperrt/Spezialbereich

Der Lagerplan zeigt eine Rasteransicht mit:
- **Gänge** (1-8)
- **Regalplätze** (A-X, Reihen 1-28)

### 7.3 Reifenlagerplatz zuweisen

1. Öffnen Sie die Kundendetails
2. Im Fahrzeugbereich sehen Sie **"Reifenlager"**
3. Wählen Sie den Lagerplatz aus dem Plan

### 7.4 Lagerplatz bei Termin anzeigen

Wenn ein Termin das Wort "Reifen" enthält, wird automatisch der Lagerplatz des Kunden angezeigt.

---

## 8. Leistungs-Vorlagen

Vorlagen sind Textbausteine für häufige Arbeiten, die Sie schnell in Termine einfügen können.

### 8.1 Vorlagen öffnen

Klicken Sie auf **"Vorlagen"** in der Seitenleiste

### 8.2 Neue Vorlage erstellen

1. Klicken Sie auf **"+ Neue Vorlage"**
2. Geben Sie einen Titel ein (z.B. "Ölwechsel")
3. Geben Sie die Beschreibung ein:
   ```
   - Motoröl wechseln
   - Ölfilter erneuern
   - Ölstand prüfen
   ```
4. Klicken Sie auf **"Speichern"**

### 8.3 Vorlage bearbeiten

1. Fahren Sie mit der Maus über eine Vorlage
2. Klicken Sie auf das **Stift-Symbol**
3. Ändern Sie Titel oder Beschreibung
4. Klicken Sie auf **"Speichern"**

### 8.4 Vorlage löschen

1. Fahren Sie mit der Maus über eine Vorlage
2. Klicken Sie auf das **Papierkorb-Symbol**
3. Bestätigen Sie die Löschung

### 8.5 Vorlage verwenden

1. Erstellen Sie einen neuen Termin
2. Wählen Sie bei **"Vorlage"** die gewünschte Vorlage aus
3. Titel und Beschreibung werden automatisch eingetragen

---

## 9. Aufgabenliste (ToDo)

Die Aufgabenliste befindet sich auf dem Dashboard.

### 9.1 Aufgabe hinzufügen

1. Geben Sie den Aufgabentext im Eingabefeld ein
2. Optional: Klicken Sie auf **👤** um einen Kunden zu verknüpfen
3. Klicken Sie auf **"+"** oder drücken Sie Enter

### 9.2 Aufgabe abhaken

Klicken Sie auf das **Kästchen** links neben der Aufgabe

### 9.3 Aufgabe löschen

Fahren Sie über die Aufgabe und klicken Sie auf das **Papierkorb-Symbol**

### 9.4 Verknüpften Kunden öffnen

Klicken Sie auf den Kundennamen unter der Aufgabe, um direkt zu den Kundendetails zu gelangen.

---

## 10. Lexware-Integration

### 10.1 Voraussetzungen

- Lexware Zugangsdaten in den Einstellungen hinterlegt
- Desktop-App (nicht im Browser verfügbar)

### 10.2 Lexware Dashboard öffnen

1. Klicken Sie auf **"Lexware"** in der Seitenleiste
2. Das Lexware Dashboard wird eingebettet angezeigt
3. Die Anmeldung erfolgt automatisch mit den hinterlegten Daten

### 10.3 Lexware Zugangsdaten einrichten

1. Gehen Sie zu **Einstellungen**
2. Tragen Sie unter **"Lexware"** Benutzername und Passwort ein
3. Klicken Sie auf **"Speichern"**

### 10.4 Lexware-Synchronisation

1. Gehen Sie zu **Einstellungen**
2. Klicken Sie auf **"Jetzt synchronisieren"**
3. Kundendaten werden mit Lexware abgeglichen

---

## 11. Conrad (Carparts) Integration

### 11.1 Voraussetzungen

- Conrad/Carparts Zugangsdaten in den Einstellungen hinterlegt
- Desktop-App (nicht im Browser verfügbar)

### 11.2 Conrad öffnen

1. Klicken Sie auf **"Conrad"** in der Seitenleiste
2. Der Carparts-Katalog wird eingebettet angezeigt
3. Die Anmeldung erfolgt automatisch

### 11.3 Zugangsdaten einrichten

1. Gehen Sie zu **Einstellungen**
2. Tragen Sie unter **"Ersatzteilkatalog (Conrad)"** die Zugangsdaten ein
3. Klicken Sie auf **"Speichern"**

---

## 12. Massen-Import

Mit dem Massen-Import können Sie viele Fahrzeugscheine auf einmal analysieren und Kunden anlegen.

### 12.1 Massen-Import starten

1. Gehen Sie zu **Kundenstamm**
2. Klicken Sie auf **"Massen-Import"**

### 12.2 Dateien hinzufügen

**Desktop-App:**
- Klicken Sie auf **"Dateien auswählen"**
- Wählen Sie mehrere Fahrzeugschein-Bilder aus

**Oder Drag & Drop:**
- Ziehen Sie Dateien in den Upload-Bereich

### 12.3 Analyse starten

1. Aktivieren Sie **"Automatisch Kunden anlegen"** wenn gewünscht
2. Klicken Sie auf **"▶️ Analyse starten"**
3. Jedes Dokument wird mit KI analysiert

### 12.4 Ergebnisse prüfen

- ✅ **Grün** = Erfolgreich analysiert & Kunde angelegt
- ⚠️ **Orange** = Mögliches Duplikat gefunden
- ❌ **Rot** = Fehler bei der Analyse

### 12.5 Duplikate behandeln

Bei Duplikaten haben Sie drei Optionen:
1. **Trotzdem anlegen** - Neuen Kunden erstellen
2. **Fahrzeug hinzufügen** - Zum bestehenden Kunden hinzufügen
3. **Überspringen** - Nicht importieren

---

## 13. Einstellungen

### 13.1 Einstellungen öffnen

Klicken Sie auf **"Einstellungen"** in der Seitenleiste oder auf dem Dashboard

### 13.2 Design

| Option | Beschreibung |
|--------|--------------|
| **Dark Mode** | Zwischen Hell und Dunkel wechseln |

### 13.3 API-Schlüssel

| Einstellung | Beschreibung |
|-------------|--------------|
| **API Key** | Allgemeiner API-Schlüssel |
| **OpenAI API Key** | Für KI-Fahrzeugschein-Analyse |
| **OpenAI Modell** | Verwendetes KI-Modell (Standard: gpt-4o-mini) |

### 13.4 KI-Prompt anpassen

Der AI-Prompt definiert, wie die KI den Fahrzeugschein analysiert. Sie können ihn anpassen für:
- Bessere Erkennung bestimmter Felder
- Andere Dokumenttypen

### 13.5 Integrationen

| Integration | Beschreibung |
|-------------|--------------|
| **Lexware** | Benutzername und Passwort für Lexware |
| **Conrad/Carparts** | Zugangsdaten für Ersatzteilkatalog |

### 13.6 Cloud / Remote Database

| Option | Beschreibung |
|--------|--------------|
| **Remote-Server verwenden** | Aktiviert den Server-Modus |
| **Server-URL** | Adresse des zentralen Servers |

### 13.7 Datenbank-Backup

1. Klicken Sie auf **"Backup erstellen"**
2. Die Datenbank wird in `prisma/backups/` gespeichert

---

## 14. Mobile Funktionen

### 14.1 Handy-Upload (Fahrzeugschein)

Diese Funktion ermöglicht das Scannen von Fahrzeugscheinen mit dem Handy:

1. Klicken Sie bei der Neukundenanlage auf **📱 "Handy-Upload"**
2. Ein QR-Code wird angezeigt
3. Scannen Sie den QR-Code mit Ihrem Handy
4. Eine Upload-Seite öffnet sich auf dem Handy
5. Fotografieren Sie den Fahrzeugschein
6. Das Bild wird automatisch an den PC übertragen

> ⚠️ **Hinweis:** Diese Funktion ist nur in der Desktop-App verfügbar und benötigt eine Netzwerkverbindung.

### 14.2 Web-Zugriff

Im Server-Modus können Sie die Anwendung auch im Browser nutzen:

1. Öffnen Sie die Server-URL im Browser (z.B. `http://192.168.0.250:3000`)
2. Melden Sie sich mit den Zugangsdaten an
3. Alle Funktionen (außer Webview-Integrationen) sind verfügbar

---

## 15. Tastenkombinationen & Tipps

### 15.1 Allgemeine Tipps

| Tipp | Beschreibung |
|------|--------------|
| **Schnellsuche** | Im Kundenstamm können Sie nach Name oder Telefon suchen |
| **Vorlagen nutzen** | Erstellen Sie Vorlagen für häufige Arbeiten |
| **Reifenlagerplatz** | Wird automatisch bei Reifenterminen angezeigt |
| **Historie** | Abgeschlossene Termine landen automatisch in der Kundenhistorie |

### 15.2 Workflow-Empfehlungen

**Neukunde mit Fahrzeug:**
1. Dashboard → "Neuaufnahme" → "Neukunde"
2. Fahrzeugschein fotografieren (Handy-Upload oder Datei)
3. Mit KI analysieren
4. Daten prüfen und speichern

**Termin anlegen:**
1. Kalender öffnen
2. Tag anklicken
3. Vorlage auswählen
4. Kunde und Fahrzeug zuweisen
5. Speichern

**Termin abschließen:**
1. Termin im Kalender öffnen
2. "Abschließen" klicken
3. Kilometerstand eingeben
4. Historie wird automatisch aktualisiert

---

## 16. Fehlerbehebung

### 16.1 Häufige Probleme

| Problem | Lösung |
|---------|--------|
| **KI-Analyse funktioniert nicht** | Prüfen Sie den OpenAI API-Key in den Einstellungen |
| **Lexware/Conrad nicht verfügbar** | Diese Funktionen sind nur in der Desktop-App verfügbar |
| **Handy-Upload funktioniert nicht** | Stellen Sie sicher, dass PC und Handy im gleichen Netzwerk sind |
| **Daten werden nicht synchronisiert** | Prüfen Sie die Server-URL in den Einstellungen |
| **App startet nicht** | Versuchen Sie einen Neustart oder prüfen Sie die Konsole auf Fehler |

### 16.2 Logs einsehen

Die Anwendung erstellt Logdateien die bei Problemen helfen können:
- Öffnen Sie die Entwicklertools (F12)
- Wechseln Sie zur Konsole
- Fehler werden rot markiert

### 16.3 Datenbank zurücksetzen

> ⚠️ **Warnung:** Dabei gehen alle Daten verloren!

1. Löschen Sie die Datei `prisma/app.db`
2. Führen Sie `npx prisma db push` aus
3. Starten Sie die Anwendung neu

### 16.4 Support

Bei weiteren Problemen:
- Prüfen Sie die README.md für technische Details
- Erstellen Sie ein Backup bevor Sie Änderungen vornehmen
- Kontaktieren Sie den technischen Support

---

## Versionsinformationen

- **Version:** Aktuelle Entwicklungsversion
- **Letzte Aktualisierung:** Januar 2026
- **Unterstützte Plattformen:** Windows (Desktop-App), Web-Browser (Server-Modus)

---

*Diese Dokumentation wurde für den KFZ Werkstatt Manager erstellt. © 2026*
