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

## Konfiguration

Der Server muss nicht installiert werden. `npx` holt ihn direkt von GitHub, wie
`ghost-mcp` sich per `npx -y` aus der npm-Registry holt — ein Eintrag in der
Client-Konfiguration genügt.

Nötig sind drei Umgebungsvariablen, dieselben wie bei `ghost-mcp`, sodass ein
Konfigurationsblock für beide Server passt:

| Variable | | |
|---|---|---|
| `GHOST_API_URL` | Pflicht | Basis-URL der Ghost-Instanz, ohne Pfad |
| `GHOST_ADMIN_API_KEY` | Pflicht | Admin-API-Key im Format `{24 Hex}:{64 Hex}` |
| `GHOST_API_VERSION` | optional | Standard `v5.0` |

Den Key liefert Ghost unter **Settings → Integrations → Add custom integration**.
Er gehört in die Client-Konfiguration, nicht ins Repo.

### Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json` unter
`mcpServers`:

```json
"ghost-upload": {
  "command": "npx",
  "args": ["-y", "github:jakob-koenen/ghost-upload-mcp"],
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
  -- npx -y github:jakob-koenen/ghost-upload-mcp
```

### Version festnageln

`github:jakob-koenen/ghost-upload-mcp` folgt dem Standard-Branch. Ein Tag oder
Commit hinter `#` bindet stattdessen einen festen Stand:

```
github:jakob-koenen/ghost-upload-mcp#v1.0.0
```

### Lokal statt über GitHub

Für Entwicklung am Server selbst:

```bash
git clone https://github.com/jakob-koenen/ghost-upload-mcp.git
cd ghost-upload-mcp
npm install
```

Der Config-Eintrag zeigt dann auf die Datei statt auf GitHub:

```json
"command": "node",
"args": ["/pfad/zu/ghost-upload-mcp/index.js"]
```

Voraussetzung in beiden Fällen: Node 18 oder neuer. Gestartet wird der Server
nicht von Hand, sondern über stdio vom MCP-Client.

## Fehlerverhalten

Beim Start bricht der Server mit einer einzeiligen Meldung auf stderr ab, wenn
eine Pflichtvariable fehlt oder der Key nicht dem Format `{24 Hex}:{64 Hex}`
entspricht. Zur Laufzeit werden zwei Fälle sauber zurückgemeldet, statt den
Server zu beenden:

- Pfadprobleme vor dem Upload — Datei nicht gefunden, Verzeichnis statt Datei
- Antworten von Ghost — Meldung samt `context` und `help`, etwa bei ungültigem
  Key oder abgelehntem Dateityp

## Lizenz

MIT
