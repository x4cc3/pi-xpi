# pi-lookup

Web search, page fetch, library docs (Context7), and GitHub Q&A (DeepWiki) for Pi Agent. **No API keys** for search/fetch/docs (DeepWiki is public repos only).

## Install

```bash
pi install npm:@xaccefy/pi-lookup
```

## Tools

### `web_search`
Asks search engines through the local `open-websearch` tool (no API key).

- `query` (required)
- `limit` (optional, default 10)
- `engines` (optional, e.g. `duckduckgo`, `brave`, `bing`)

### `web_fetch`
Fetches a URL as clean text/markdown (GitHub READMEs use a dedicated path).

- `url` (required, http/https)

**JS pages:** if it only sends back a bare HTML shell, `web_fetch` re-draws it with system Chromium (`--headless --dump-dom`) when present, and uses the fuller text.

| Variable | Purpose |
|----------|---------|
| `PI_CHROMIUM_PATH` | Absolute path to chromium/chrome binary |
| `PI_WEBSEARCH_PORT` | Daemon port (default `3210`) |

It also tries: `/usr/bin/chromium`, `/usr/sbin/chromium`, Chrome stable paths, etc. If Chromium isn’t there, you get the plain extract.

### `context7`
Up-to-date library docs + examples.

- `libraryName` (required, e.g. `react`)
- `topic` (optional, e.g. `hooks`)
- `maxTokens` (optional, default 10000)

### `deepwiki`
Natural-language Q&A over a public GitHub repo.

- `repo` (required, `owner/name`)
- `question` (required)

## Lifecycle

- **session_start**: tries to start the `open-websearch` tool (non-blocking).
- **session_shutdown**: stops the tool this add-on started.

## Development

```bash
bun test packages/pi-lookup
bun run typecheck
```
