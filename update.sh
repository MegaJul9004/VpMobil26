#!/bin/bash

# Bei Fehlern sofort abbrechen
set -e

echo "=== 1. Hole neueste Version von GitHub ==="
git pull origin main

echo "=== 2. Prüfe auf neue Abhängigkeiten ==="
npm install

echo "=== 3. Baue das Projekt (npm run build) ==="
npm run build

echo "=== 4. Beende alte Instanz auf Port 3005 ==="
fuser -k 3005/tcp || true

echo "=== 5. Starte die Anwendung neu (npm run start) ==="
npm run start
