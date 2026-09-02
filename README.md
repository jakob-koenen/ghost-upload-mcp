# ghost-upload-mcp

MCP-Server für Datei-Uploads zu Ghost. Ergänzt `ghost-mcp` (MFYDev/ghost-mcp),
das alles außer Uploads kann, und bleibt bewusst auf drei Tools beschränkt.

## Tools

| Tool | Parameter | Rückgabe |
|---|---|---|
| `ghost_upload_image` | `file`, `purpose` (`image` \| `profile_image` \| `icon`), `ref` | CDN-URL |
| `ghost_upload_file` | `file`, `ref` | öffentliche URL |
| `ghost_upload_media` | `file`, `thumbnail` | öffentliche URL |

Die zurückgegebene URL wandert anschließend in `posts_add` — als `feature_image`
oder als `<img src>` im HTML.

## Dateipfade

MCP transportiert keine Binärdaten. Jeder Upload bekommt deshalb einen Pfad auf
diesem Mac, nie die Datei selbst: `~/Downloads/atrium-aufmacher.jpg`. Ein Bild
ins Chatfenster zu ziehen funktioniert nicht als Upload-Quelle.

`~` wird aufgelöst, relative Pfade werden gegen das Arbeitsverzeichnis des
Servers aufgelöst — absolute Pfade oder `~/…` sind deshalb die verlässliche Form.

## Konfiguration

Dieselben Umgebungsvariablen wie `ghost-mcp`, damit ein Config-Block für beide
Server reicht:

- `GHOST_API_URL` (Pflicht)
- `GHOST_ADMIN_API_KEY` (Pflicht)
- `GHOST_API_VERSION` (optional, Standard `v5.0`)

Der Admin-API-Key steht nicht im Repo, sondern kommt aus `env` in
`claude_desktop_config.json`.

Eintrag in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
"ghost-upload": {
  "command": "node",
  "args": ["/Users/jakobkoenen/ghost-upload-mcp/index.js"],
  "env": {
    "GHOST_API_URL": "https://aufrecht.digital",
    "GHOST_ADMIN_API_KEY": "…",
    "GHOST_API_VERSION": "v5.0"
  }
}
```

Danach Claude Desktop neu starten.

## Installation

```bash
npm install
```

Der Server läuft per stdio und wird von Claude Desktop gestartet, nicht von Hand.
