# pi-casefile

Local security case book for Pi Agent. Keeps your guesses → proven findings behind a PoC gate, saved in SQLite, run in a sandbox.

## Install

```bash
pi install npm:@xaccefy/pi-casefile
```

Or via the XPI umbrella package: `pi install npm:@xaccefy/pi-xpi`

## XP mode (default OFF)

The attack-mode text stays **quiet by default** so your normal coding isn't buried in security talk.

| Control | Effect |
|---------|--------|
| `/xp` | Toggle ON/OFF |
| `/xp on` / `/xp off` | Set explicitly |
| `PI_XP_MODE=on` | Force ON for this process (overrides file) |
| `PI_XP_MODE=off` | Force OFF |

When **ON**, every prompt gets the attacker-minded workflow plus any open cases. When **OFF**, nothing is added; tools still work.

State is persisted next to the ledger as `xp-mode` (e.g. `.pi/xp-mode`).

## Environment

| Variable | Purpose |
|----------|---------|
| `PI_CASEFILE_PATH` | Absolute path to the SQLite ledger file |
| `CASEFILE_WORKSPACE_ROOT` / `PI_WORKSPACE_ROOT` | Override workspace root used to place `.pi/casefile.db` |

Default DB path: `<workspace>/.pi/casefile.db`

## State machine

```
hypothesis → investigating → confirmed → reported
                 ↓               ↓
              blocked         killed (terminal)
```

- **investigating** needs `evidence` + `confidence`
- **confirmed** only by running the PoC (`PromoteFinding`, exit 0) — you can't just set status to confirmed
- **reported** needs `CaseReport` first
- **killed** / **reported** are final (no more edits)

There is **no** `impact_proof` field. Put proof in `impact` or `evidence`.

## Tools

| Tool | Use |
|------|-----|
| `CaseAdd` | Open a case (`title` required; start as `hypothesis` or `investigating`) |
| `CaseUpdate` | Evidence, impact, severity, status (not direct confirm) |
| `PromoteFinding` | Run on-disk PoC (Docker sandbox by default; `local:true` for host) → confirm on exit 0 |
| `CaseGet` / `CaseList` / `CaseSearch` | Read / filter / search |
| `CaseLink` / `CaseUnlink` | Bidirectional exploit chains |
| `CaseReport` | Markdown report for confirmed/reported cases |

Commands: `/casefile` (dashboard), `/xp` (XP mode).

## Development

```bash
bun test packages/pi-casefile
bun run typecheck
```
