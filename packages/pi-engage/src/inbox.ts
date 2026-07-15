/**
 * Disposable inbox for autonomous signup verification.
 *
 * Wraps a temp-mail API (mail.tm by default — free, no API key) so the agent
 * can receive a verification email and extract the link without a human-owned
 * mailbox. This is the realistic unauth → low-priv attacker seat: the agent uses
 * the target's own signup flow and a throwaway inbox, same as an external user.
 *
 * The human still scopes the *target* (authorized engagement). The agent only
 * owns the throwaway identity it creates through the target's public flow.
 *
 * Provider is intentionally single (mail.tm) — add others behind this class if
 * a target blocks it. No API key, 8 QPS per-IP limit (we pace well under it).
 */

import type { FetchImpl } from "./types.ts";

const MAILTM_API = "https://api.mail.tm";
const MAILTM_RATE_MS = 250; // stay far under the 8 QPS per-IP cap

export interface InboxMessage {
  id?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
}

export class DisposableInbox {
  readonly address: string;
  private readonly token: string;
  private readonly fetchImpl: FetchImpl;

  private constructor(address: string, token: string, fetchImpl: FetchImpl) {
    this.address = address;
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  /** Create a fresh inbox on a random available domain. */
  static async create(fetchImpl: FetchImpl = fetch): Promise<DisposableInbox> {
    const domainsRes = await fetchImpl(`${MAILTM_API}/domains`);
    if (!domainsRes.ok) {
      throw new Error(`mail.tm domains failed: HTTP ${domainsRes.status}`);
    }
    const domains = (await domainsRes.json()) as { "hydra:member"?: { domain: string }[] };
    const domain = domains["hydra:member"]?.[0]?.domain;
    if (!domain) throw new Error("mail.tm returned no domains");

    const address = `${crypto.randomUUID().replace(/-/g, "")}@${domain}`;
    const password = crypto.randomUUID().replace(/-/g, "");

    const acctRes = await fetchImpl(`${MAILTM_API}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    });
    if (!acctRes.ok) {
      throw new Error(`mail.tm account creation failed: HTTP ${acctRes.status}`);
    }

    const tokenRes = await fetchImpl(`${MAILTM_API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    });
    if (!tokenRes.ok) {
      throw new Error(`mail.tm token failed: HTTP ${tokenRes.status}`);
    }
    const { token } = (await tokenRes.json()) as { token: string };

    return new DisposableInbox(address, token, fetchImpl);
  }

  /** Poll for a message matching `predicate` within `timeoutMs`. */
  async waitForMessage(
    predicate: (m: InboxMessage) => boolean,
    timeoutMs = 90_000,
  ): Promise<InboxMessage | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const list = await this.listMessages();
      for (const m of list) {
        const full = await this.getMessage(m.id ?? "");
        if (predicate(full)) return full;
      }
      await new Promise((r) => setTimeout(r, MAILTM_RATE_MS * 5));
    }
    return undefined;
  }

  /** First http(s) URL that looks like a verification link, else the first URL. */
  static extractVerificationLink(msg: InboxMessage): string | undefined {
    const hay = `${msg.text ?? ""}\n${msg.html ?? ""}`;
    const links = hay.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    return links.find((l) => /verify|confirm|activation|activate|token/i.test(l)) ?? links[0];
  }

  private async listMessages(): Promise<InboxMessage[]> {
    await new Promise((r) => setTimeout(r, MAILTM_RATE_MS));
    const res = await this.fetchImpl(`${MAILTM_API}/messages`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { "hydra:member"?: InboxMessage[] };
    return data["hydra:member"] ?? [];
  }

  private async getMessage(id: string): Promise<InboxMessage> {
    await new Promise((r) => setTimeout(r, MAILTM_RATE_MS));
    const res = await this.fetchImpl(`${MAILTM_API}/messages/${id}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`mail.tm message fetch failed: HTTP ${res.status}`);
    return (await res.json()) as InboxMessage;
  }
}
