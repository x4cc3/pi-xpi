# pi-engage

Authenticated-session manager + **pdtm-tool bridge** for [Pi Agent](https://github.com/earendil-works/pi) — part of **XPI**.

`pi-engage` gives the XPI offensive toolchain a sanctioned place to hold the
credentials a **user supplies** for an authorized engagement (the `engage`
prompt forbids inventing or borrowing them). It resolves a session into request
headers / mTLS flags and hands them straight to `curl`, `httpx`,
`ffuf`, … — **no MITM proxy required**. The pdtm tools
already capture their own output, so a Burp/Caido intercepting proxy is optional
observability, not a prerequisite.

## Auth modes

| Mode | What it stores | Autonomy | Notes |
|------|----------------|----------|-------|
| `cookie` | raw `Cookie` header | Low — user re-pastes on expiry | Simplest; the agent impersonates the logged-in user |
| `oauth-client-credentials` | `tokenUrl`, `client_id`, `client_secret`, `scope` | **High — no human at runtime** | Agent is its own service identity; token is fetched + auto-refreshed |
| `mtls` | client cert/key + CA path | **Highest — no token exchange** | TLS handshake *is* the auth |

## Tools

### `engage`

| Action | Args | Purpose |
|--------|------|---------|
| `add` | `label`, `mode`, mode-specific fields, optional `target`/`caseId`/`id` | Save a session |
| `get` | `id` | Show one session (secrets masked) |
| `list` | — | List all sessions |
| `token` | `id` | Resolve a session into `headers`, `curlFlags`, `curlExample` (fetches/refreshes token for oauth) |
| `delete` | `id` | Remove a session |
| `clear` | — | Remove all sessions |
| `run` | `tool`, `url`, optional `sessionId`/`args` | Run a pentest CLI with auth injected (`curl`/`httpx`/`ffuf`) |
| `send` | `url`, optional `sessionId`/`method`/`body`/`headers` | Single authenticated request (returns a `curl` command) |
| `spider` | `url`, optional `sessionId`/`inScope`/`depth` | Crawl in-scope links with the session applied |
| `scan` | `url`, optional `sessionId` | Fast passive security-header check (no external scanner) |
| `signup` | `signupUrl`, optional `signupFields`/`verifyStrategy`/`loginUrl`/`loginFields`/`target` | Make a temp account on the target's own signup page; auto-confirm email (mail.tm) and, if you want, prove it by logging in |
| `login` | `loginUrl`, optional `loginFields`/`target` | Log in with the details you give; grab the session (cookie or token). `signup` uses this to prove the account is real |

### `/engage`

Show stored sessions (interactive).

## Make a temp account (`signup`)

`signup` makes a **temp account** right on the target's own
signup page — the same spot an outside attacker would use. The agent
only ever owns the temp account it makes; you pick the *target*
(a bug-bounty site you're cleared for).

- **Confirm email** (`verifyStrategy`): `auto` (a link sent back in the
  signup reply, then a temp email box) | `response` (link in the reply) |
  `inbox` (watch a mail.tm box for the confirm mail) | `none` (skip).
- **Fill-ins**: in `signupFields` / `loginFields`, write `<EMAIL>`,
  `<USER>`, `<PASS>` and they get filled in. `inbox` opens a real
  mail.tm box (free, no key).
- **Prove it**: add `loginUrl` + `loginFields`, and after signup the
  agent logs in with the same details. `accountConfirmed` is `true`
  only if the email was confirmed **or** the login worked — a
  signed-up-but-not-confirmed account shows as *unconfirmed*, never a win.
- **Refused**: if the target sends back an HTTP error or an error
  message in the reply (like `{ Ack: "Failure", Errors: [...] }`),
  `signup` says it was refused and saves **no** session.

## Examples

```text
# Cookie (user pastes from browser devtools)
engage action=add label=shop target=shop.example.com mode=cookie cookie="session=abc123; csrf=xyz"

# OAuth: agent's own login, no human needed while running
engage action=add label=shop-api target=api.shop.example.com mode=oauth-client-credentials \
     tokenUrl=https://auth.shop.example.com/oauth/token \
     clientId=pentest-agent-01 clientSecret=*** scope="pentest:read pentest:test"

# mTLS — certificate presented in the TLS handshake
engage action=add label=shop-mtls target=api.shop.example.com mode=mtls \
     certPath=~/certs/agent.pem keyPath=~/certs/agent.key caPath=~/certs/ca.pem

# Run a real scanner authenticated — auth is injected automatically
engage action=run tool=httpx url=https://shop.example.com sessionId=shop-api args="-silent"

# Single authenticated request; result includes a ready curl command
engage action=send url=https://shop.example.com/account sessionId=shop

# Authenticated discovery
engage action=spider url=https://shop.example.com/ sessionId=shop inScope=["shop.example.com"]

# Scan: fast passive header check
engage action=scan url=https://shop.example.com/ sessionId=shop

# Make a temp account and prove it by logging in
engage action=signup signupUrl=https://app.target.com/api/register target=app.target.com \
     signupFields='{"email":"<EMAIL>","password":"<PASS>"}' \
     verifyStrategy=auto loginUrl=https://app.target.com/api/login \
     loginFields='{"email":"<EMAIL>","password":"<PASS>"}'

# Log in on your own once an account exists
engage action=login loginUrl=https://app.target.com/api/login target=app.target.com \
     loginFields='{"email":"you@example.com","password":"..."}'
```

`run` builds e.g. `httpx -H "Authorization: Bearer <token>" -u https://shop.example.com -silent`.
`curl` gets a positional URL; everything else gets `-u`.
everything else gets `-u`.

## Autonomy note

The agent never logs in as you. You give it the approved target and a
session you set up (cookie, client-credentials, or mTLS), and from
there it runs the loop on its own — turn auth into headers, fire tools,
crawl, scan — without you logging in again. Tag a session with
`caseId` to tie it to a case.

`signup` is separate: a self-run seat where the agent makes its own
temp account on a target you cleared (a bug-bounty site). It never
makes up or reuses your passwords. If signup gets blocked (SMS,
captcha, locked domain), the agent logs that as a case instead of
asking you for secrets.

## Storage

Sessions persist as JSON under `~/.pi/xpi-engage` (override with `PI_ENGAGE_DIR`) —
outside the repo and git-ignored, so secrets never enter version control.
