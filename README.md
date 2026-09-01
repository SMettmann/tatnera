# TATNERA MVP Prototype

**Studio Software for Tattoo Artists**

Erster klickbarer Frontend-Prototyp für das TATNERA-MVP.

## Bereits enthalten

- Dashboard mit Tagesübersicht und Kennzahlen
- Kundenliste und Kundenakte
- Tattoo-Projekte / Tattoo-Akte
- Preis und Anzahlung
- Einwilligungs-/Dokumentationsstatus als Grundgerüst
- Farben / Chargen als Grundgerüst
- Entwurfs- und Versionsbereich für den Procreate-Workflow
- Anfrage-Pipeline als UI-Konzept
- Responsive Layout für Desktop und Smartphone
- Lokale Demo-Daten via `localStorage`

## Start

Einfach `index.html` im Browser öffnen. Für sauberes lokales Serving z. B.:

```bash
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

## Wichtig

Dieser Stand ist ein **Frontend-Prototyp**, noch keine produktive SaaS-Anwendung. Als nächster technischer Schritt sollten wir Backend/Auth/Storage anbinden und danach Kalender, Einwilligungen/PDFs, Farben/Chargen und Automatisierungen produktiv machen.
