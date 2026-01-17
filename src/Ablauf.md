1. System Boot
   1. Lade Konfiguration aus Root-Verzeichnis (bridge.config)
   2. Lade Geräte-Datenbank (bridge.db, SQLite3)
      1. devices
      2. groups
      3. scenes
      4. schedules
      5. rules
      6. lights
      7. sensors
      8. config
      9. resourcelinks
      10. capabilities
      11. users
2. Starte Webserver (für API)
   1. v1 API
   2. v2 API
      1. SSE
3. Starte multicast DNS
   1. _hue._tcp._local.