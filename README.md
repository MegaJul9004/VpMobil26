# VpMobil24 PWA (Next.js, Drizzle, Mobile-First & Responsive)

Ein moderner, performanter Web-App-Klon (Progressive Web App) der bekannten Schul-Vertretungsplan-App **VpMobil24** (Indiware / `stundenplan24.de`). Die Anwendung bietet volle Offline- & PWA-Fähigkeit, automatisches 5-Minuten-Hintergrund-Polling auf Planänderungen mit Web-Push-Benachrichtigungen, ein interaktives Zoom-/Pan-Wochenraster sowie ein adaptives, responsives UI für Smartphone, Tablet und Desktop.

---

## ✨ Features im Überblick

### 1. Schneller, robuster XML-Parser & Wochen-Aggregator
- **Indiware Mobil XML-Support:** Parst native `PlanKl{YYYYMMDD}.xml`-Dateien über HTTP Basic Auth.
- **Automatisches BOM-Stripping:** Sicheres Entfernen von UTF-8 BOMs (`\uFEFF`).
- **Wochen-Aggregator:** Parallele Zusammenführung der Tage Montag bis Freitag zu einer Gesamtwoche mit Cache-Handling und Fehlertoleranz (z. B. bei Feiertagen oder 404-Tagen).
- **A/B-Wochen-Erkennung:** Automatische Auswertung aus dem `<woche>`-Tag des XML-Kopfs mit ISO-Kalenderwochen-Fallback.
- **Kurs- & Unterrichtsauflösung:** Zuordnung von Fachkürzeln (`UeFa`), Lehrkräften (`UeLe`), Kursgruppen (`UeGr`) und Änderungsattributen (`FaAe`, `LeAe`, `RaAe`, `<If>`).

### 2. Differenz-Engine & 5-Minuten-Push-Worker
- **Diffing-Engine (`diffClassDay`):** Vergleicht den aktuellen Stand mit dem letzten Datenbank-Snapshot der abonnierten Klasse und der gewählten Kurse.
- **Intelligente Benachrichtigungstexte:** Filtert reine Zeitstempel-Änderungen heraus und erzeugt prägnante Änderungsbeschreibungen, z. B.:
  > `🚨 Planänderung 9F (Do, 12.11.)`  
  > `3. Std: Mathe entfällt (Info: Aufgaben im Hefter) | 5. Std: Englisch jetzt in Raum 204 (statt 102) bei Fr. Meyer`
- **Autonomer Background-Worker (`worker.ts`):** Cronjob (`*/5 * * * *`), der Abonnenten über `web-push` (VAPID) in Echtzeit über Ausfälle, Raum- und Lehrkraftwechsel informiert.

### 3. Homescreen & Favoritenverwaltung
- **Konfigurierbare Favoriten-Slots:** Dynamische Anzeige von 1 bis 10 Favoriten-Kacheln (Standard: 3 Slots).
- **Keine Zwangsvoreinstellung:** Favoriten starten bewusst leer und können direkt per Klassen-Schnellwahl oder Direktsuche belegt werden.
- **Direktzugriff:** Ein Klick auf eine belegte Favoritenkarte öffnet sofort den aktuellen Stundenplan der Klasse.

### 4. Plan-Ansicht & Kalender-Navigation
- **Direkt-Umschalter:** Umschalten zwischen `[ 📅 Tagesplan ]` und `[ 🗓️ Wochenplan ]` ohne Seiten-Reload.
- **Vollständiger Header:**
  - Anzeige der Kalenderwoche (**KW**), des Wochen-Typs (**A-Woche / B-Woche**) und der Datumsspanne (**von DD.MM.YYYY bis DD.MM.YYYY**).
  - Vor- und Zurückblättern über Navigationspfeile mit automatischer Neuberechnung aller Wochenmetadaten.
  - Manueller Aktualisieren-Button (`RotateCw`) mit Ladeanimation.
  - **Kurse-Filter Modal:** Selektives Ein- und Ausblenden bestimmter Fächer und Kurse.

### 5. Strenges 5-Tage-Wochenraster mit Zoom & Pan
- **Striktes Spalten-Layout:** Montag bis Freitag stehen ausnahmslos als 5 gleichmäßige Spalten nebeneinander, ergänzt um die links fixierte Unterrichtsstunden-Spalte (1.–10. Stunde).
- **Interaktives Canvas:**
  - **Touch:** Pinch-to-Zoom mit zwei Fingern & freies Verschieben (Pan) per Wischgeste.
  - **Desktop:** Zoomen per Mausrad (zum Cursor) & Verschieben per Drag-and-Drop mit gedrückter linker Maustaste.
  - **Floating-Controls:** Buttons für `[ + ]`, `[ − ]`, Prozentanzeige und `[ ⟲ Reset ]`.
- **Eck- & Kanten-Begrenzung:** Der Plan kann nicht kleiner als 100 % gezoomt werden; beim Erreichen von 100 % rastet die Ansicht wieder bündig an den Ecken des Displays ein.
- **Persistenz:** Zoomstufe und Position werden optional im `localStorage` gemerkt (abschaltbar in den Einstellungen).

### 6. Interaktionen & Web Share API
- **Long-Press-Geste:** Gedrückthalten eines Tages öffnet ein Aktionsmenü mit **Teilen**-Button.
- **Native Share Integration:** Formatiert den Tagesplan (Klasse, Datum, Fächer, Stundenzeiten, Räume, Hinweise) und übergibt ihn an das native OS-Share-Sheet (`navigator.share`) bzw. die Zwischenablage als Fallback.

### 7. Theming & Custom Color Presets
- **Presets:** Hell (Light), Dunkel (Dark) und Ozean.
- **Farbeditor:** Eigene Themes erstellbar mit individuellem Namen, Primärfarbe, Hintergrundfarbe und Akzentfarbe.
- Vollständige CSS-Variablen-Steuerung ohne Flackern beim Laden.

### 8. Adaptives Layout (Mobile-First bis Desktop)
- **Mobile (< 768px):** Fixierte Bottom Navigation Bar (`pb-safe`), Tagesplan mit Wochentag-Tabs (`Mo Di Mi Do Fr`), 5-Spalten-Canvas im Wochenplan.
- **Desktop (>= 768px):** Aufgeräumte Sidebar mit Schnellwahl der Favoriten, vollflächiges Wochenraster mit direkter Lesbarkeit der Kacheln und Hover-Tooltips, 2-Spalten-Tagesplan-Dashboard (Stundenplan links, Infoticker & Schulnachrichten rechts).

---

## 🛠️ Tech-Stack

- **Frontend / Framework:** [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [lucide-react](https://lucide.dev/)
- **Datenbank / ORM:** SQLite (`better-sqlite3`) mit [Drizzle ORM](https://orm.drizzle.team/)
- **XML-Parsing:** `fast-xml-parser`
- **Push-Benachrichtigungen:** `web-push` (VAPID)
- **Background Worker:** `node-cron` & `tsx`
- **Testing & Verification:** [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/)

---

## 🚀 Installation & Lokaler Start

### 1. Repository klonen & Abhängigkeiten installieren
```bash
cd vpmobil24
npm install
```

*(Hinweis für Umgebungen mit eingeschränkten Install-Skripten: `npm install-scripts approve better-sqlite3 esbuild && npm rebuild better-sqlite3 esbuild`)*

### 2. Umgebungsvariablen einrichten (`.env`)
Erstelle eine Datei `.env` im Wurzelverzeichnis:

```env
# Schulzugangsdaten (Indiware / stundenplan24.de)
SCHOOL_NUMBER=53111842
SCHOOL_USER=schueler
SCHOOL_PASSWORD=s2z5665
DEFAULT_CLASS=9F

# Web-Push (VAPID)
VAPID_PUBLIC_KEY=DEIN_OEFFENTLICHER_SCHLUESSEL
VAPID_PRIVATE_KEY=DEIN_PRIVATER_SCHLUESSEL
VAPID_SUBJECT=mailto:admin@example.com
```

> **Tipp:** Ein neues VAPID-Schlüsselpaar kann jederzeit via `npx web-push generate-vapid-keys --json` generiert werden.

### 3. Datenbank initialisieren
Führe die Drizzle-Migrationen aus:
```bash
npm run db:migrate
```

### 4. Anwendung starten
Startet sowohl die Next.js-Web-App als auch den 5-Minuten-Cron-Worker parallel:

```bash
# Entwicklungsmodus
npm run dev

# Produktionsbuild & Start
npm run build
npm run start
```

Die Anwendung ist anschließend unter `http://localhost:3000` erreichbar.

---

## 🧪 Tests & Qualitätssicherung

```bash
# Unit-Tests ausführen (Parser, Diffing, Dates, Settings, Zoom)
npm run test

# TypeScript-Typprüfung
npm run typecheck

# Linter ausführen
npm run lint
```

---

## 📂 Projektstruktur

```
vpmobil24/
├── drizzle/                   # SQL-Migrationsdateien
├── public/                    # Statische Assets, PWA-Icons, Manifest & sw.js
├── src/
│   ├── app/                   # Next.js App Router (Pages & API-Routen)
│   │   ├── api/
│   │   │   ├── subscribe/     # Push-Abonnements verwalten
│   │   │   ├── test-push/     # Test-Push auslösen
│   │   │   ├── vapid/         # Bereitstellung des Public Keys
│   │   │   └── week/          # Stundenplan-Aggregator-API
│   │   ├── globals.css        # Globale Styles & CSS-Theme-Variablen
│   │   ├── layout.tsx         # Root-Layout mit PWA-Metadaten
│   │   └── page.tsx           # Einstiegsseite
│   ├── components/            # UI-Komponenten
│   │   ├── HomeScreen.tsx     # Homescreen & Favoriten-Grid
│   │   ├── PlanScreen.tsx     # Stundenplanansicht & Navigation
│   │   ├── SettingsScreen.tsx # Einstellungen (Zugangsdaten, Themes, Favoriten)
│   │   ├── Shell.tsx          # Adaptiver App-Container (Mobile vs. Desktop)
│   │   ├── WeekCanvas.tsx     # Strenges 5-Tage-Raster mit Zoom/Pan
│   │   └── ui.tsx             # Wiederverwendbare Basiskomponenten & Modale
│   ├── db/                    # Drizzle ORM Schema & SQLite-Verbindung
│   └── lib/                   # Hilfsfunktionen & Business-Logik
│       ├── plan/              # XML-Parser, Diffing-Engine, Datumshelfer, Fetcher
│       ├── client/            # Client-Hooks (useSettings, usePush, useLocalStorage)
│       ├── push.ts            # Web-Push Versandlogik
│       ├── settings.ts        # Einstellungs-Typen & Validierung
│       ├── share.ts           # Formatierung für Web Share API
│       └── themes.ts          # Farb-Presets & Theme-Engine
├── tests/                     # Unit-Tests (Vitest)
├── worker.ts                  # Eigenständiger Node.js-Hintergrund-Worker (5-Min-Cron)
├── drizzle.config.ts          # Drizzle Kit Konfiguration
├── tailwind.config.ts         # Tailwind Konfiguration
└── package.json
```

---

## 📱 PWA-Installation
- **Android / Chrome / Desktop:** In der Adressleiste auf das Installations-Symbol oder das Kontextmenü "App installieren" klicken.
- **iOS / iPadOS (Safari):** Teilen-Button antippen und **"Zum Home-Bildschirm"** wählen (für Web-Push zwingend erforderlich).

---

## 🔒 Datenschutz & Sicherheit
- Alle Zugangsdaten zur Schule verbleiben serverseitig in der `.env` bzw. in der geschützten SQLite-Datenbank und werden niemals im Frontend im Klartext ausgeliefert.
- Auf Endgeräten gespeicherte Favoriten und Themes liegen ausschließlich im lokalen Speicher (`localStorage`) des Nutzers.
