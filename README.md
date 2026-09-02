# ghost-upload-mcp

MCP-Server für Datei-Uploads zu Ghost: Bilder, Dateien und Medien landen mit
einem Tool-Aufruf in der Ghost-Instanz, zurück kommt die öffentliche URL.

Gedacht als Ergänzung zu [MFYDev/ghost-mcp](https://github.com/MFYDev/ghost-mcp),
das Posts, Tags, Members und vieles mehr abdeckt — aber keine Uploads kennt.
Beide Server laufen parallel und teilen sich dieselben Umgebungsvariablen.

## Warum ein zweiter Server statt eines Forks

`ghost-mcp` bringt `@tryghost/admin-api` bereits als Abhängigkeit mit, und diese
Bibliothek kann Uploads vollständig. Es fehlt allein die MCP-Tool-Hülle. Als
eigener Server bleibt `ghost-mcp` unangetastet und aktualisiert sich über
`npx -y` weiter von selbst; ein Fork müsste bei jedem Upstream-Release
nachgezogen werden.

## Tools

| Tool | Parameter | Zweck |
|---|---|---|
| `ghost_upload_image` | `file`, `purpose` (`image` \| `profile_image` \| `icon`), `ref` | Aufmacherbilder, Bilder im Fließtext, Avatare, Favicon |
| `ghost_upload_file` | `file`, `ref` | beliebige Dateien, etwa PDFs als Download im Beitrag |
| `ghost_upload_media` | `file`, `thumbnail` | Video- und Audiodateien, optional mit Vorschaubild |

Jedes Tool antwortet mit der öffentlichen URL — und mit `ref`, falls gesetzt.
Diese URL wandert anschließend in den Beitrag: als `feature_image` oder als
`<img src>` im HTML.

## Dateipfade

MCP transportiert keine Binärdaten. Jeder Upload bekommt deshalb **einen Pfad
auf dem Rechner, auf dem der Server läuft** — nie die Datei selbst:

```
~/Downloads/aufmacher.jpg
```

Ein Bild ins Chatfenster zu ziehen funktioniert damit nicht als Upload-Quelle.
Das gilt für jede MCP-Lösung, nicht nur für diese.

`~` wird aufgelöst, ebenso `file://`-URLs. Relative Pfade beziehen sich auf das
Arbeitsverzeichnis des Serverprozesses, das der Client vorgibt — absolute Pfade
oder `~/…` sind deshalb die verlässliche Form.

## Installation

Node 18 oder neuer.

```bash
git clone <repo-url> ghost-upload-mcp
cd ghost-upload-mcp
npm install
```

Der Server wird nicht von Hand gestartet, sondern über stdio vom MCP-Client.

## Konfiguration

Dieselben drei Umgebungsvariablen wie `ghost-mcp`, damit ein Konfigurationsblock
für beide Server genügt:

| Variable | | |
|---|---|---|
| `GHOST_API_URL` | Pflicht | Basis-URL der Ghost-Instanz, ohne Pfad |
| `GHOST_ADMIN_API_KEY` | Pflicht | Admin-API-Key aus einer Custom Integration (`id:secret`) |
| `GHOST_API_VERSION` | optional | Standard `v5.0` |

Den Key liefert Ghost unter **Settings → Integrations → Add custom integration**.
Er gehört in die Client-Konfiguration, nicht ins Repo.

### Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` unter
`mcpServers`:

```json
"ghost-upload": {
  "command": "node",
  "args": ["/pfad/zu/ghost-upload-mcp/index.js"],
  "env": {
    "GHOST_API_URL": "https://example.com",
    "GHOST_ADMIN_API_KEY": "…",
    "GHOST_API_VERSION": "v5.0"
  }
}
```

Danach Claude Desktop neu starten.

### Claude Code

```bash
claude mcp add ghost-upload \
  --env GHOST_API_URL=https://example.com \
  --env GHOST_ADMIN_API_KEY=… \
  -- node /pfad/zu/ghost-upload-mcp/index.js
```

## Fehlerverhalten

Fehlt eine Pflichtvariable, bricht der Server beim Start mit einer Meldung auf
stderr ab. Zur Laufzeit werden zwei Fälle sauber zurückgemeldet, statt den
Server zu beenden:

- Pfadprobleme vor dem Upload — Datei nicht gefunden, Verzeichnis statt Datei
- Antworten von Ghost — Meldung samt `context` und `help`, etwa bei ungültigem
  Key oder abgelehntem Dateityp

## Lizenz

MIT
