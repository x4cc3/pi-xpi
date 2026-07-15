---
name: engage
description: Authenticated web-pentest sessions for Pi — hold a user-supplied target identity (cookie / OAuth client-credentials / mTLS) and run curl / httpx / ffuf with the auth injected. Use when the agent must operate against an authenticated web target inside a sanctioned engagement.
---

# engage

`engage` is a Pi Agent tool (`@xaccefy/pi-engage`) for **bounded autonomous web pentesting**: it
authenticates to an *authorized* target using an identity a human supplies, then runs web-pentest
actions with that auth applied. No intercepting proxy — resolved auth is handed straight to `curl`
and the pdtm tools, which capture their own output.

## Bounded autonomy (required)
- The agent **never invents, borrows, or self-authorizes** credentials. A human supplies the target
  + identity as a "session".
- Link a session to a casefile case with `caseId` so findings stay scoped to one engagement.

## Sessions — the human-supplied identity
Stored under `~/.pi/xpi-engage` (override with `PI_ENGAGE_DIR`). Auth modes:
- `cookie` — replay a browser `Cookie` header.
- `oauth-client-credentials` — agent is its own service identity; self-refreshing bearer token, zero
  human at runtime (**most autonomous**).
- `mtls` — client-certificate identity presented in the TLS handshake.

## Actions
Session management: `add | get | list | token | delete | clear`
- `token` resolves auth. For client-credentials it fetches a token and returns `headers`,
  `curlFlags`, and a ready `curl` example.

Pentest (auth injected): `run | send | spider | scan`
- `run tool=<cli>` — run a pentest CLI (`curl | httpx | ffuf`)
  with auth injected.
- `send` — single authenticated HTTP request; also returns a ready `curl` command.
- `spider` — crawl in-scope links with the session applied.
- `scan` — fast passive security-header check (no external scanner).

Account self-registration (autonomous low-priv seat): `signup`
- `signup signupUrl=<reg endpoint> target=<host> [signupFields=...] [verifyStrategy=auto]`
  creates a throwaway account through the target's own signup flow, captures the resulting
  session, and verifies email automatically. The agent **owns the identity it creates** —
  no human supplies credentials.
- Verification chain (`verifyStrategy=auto`): (1) if the signup response leaks a verify token/link,
  use it; (2) else spin a disposable inbox (mail.tm, free, no API key), poll for the verification
  email, extract the link, and click it; (3) `none` skips verification (use to test whether the
  app enforces it server-side). If verification is impossible (SMS, captcha, domain-lock) the
  agent reports the blocker as a case instead of asking the human.
- Placeholders in `signupFields`: `<EMAIL>`, `<USER>`, `<PASS>` are auto-filled.
- This is the realistic unauth → low-priv attacker seat. The human still scopes the *target*
  (authorized engagement); the agent only owns the throwaway account it provisions.

## Typical flow
1. `engage action=add mode=oauth-client-credentials tokenUrl=… clientId=… clientSecret=… scope=… caseId=<case>` — create the sanctioned session.
2. `engage action=token id=<id>` — resolve auth (headers + curlFlags + curl example).
3. `engage action=run tool=httpx args=["-u",<target>]` (or `tool=ffuf`) — pentest with auth.
4. Log observations to `casefile`.

## Companion
The `/ops` prompt enforces the sanctioned-session rule. `casefile` is the findings ledger.
