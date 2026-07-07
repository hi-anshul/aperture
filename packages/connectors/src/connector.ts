import type { Company, RawJob } from "@aperture/shared";

/**
 * Every platform integration (Greenhouse, Lever, Ashby, Workday, generic
 * static HTML, Playwright-rendered, etc.) implements this and ONLY this.
 *
 * Rule from the spec: "Never let connectors talk to each other."
 * Shared cross-cutting concerns (fetching, retries, rate limiting)
 * live in the Fetch Engine (Phase 6), not in the connector itself.
 */
export interface Connector {
  readonly platform: string;

  /** Used by the Platform Detector (Phase 5) to pick the right connector */
  canHandle(careersUrl: string): boolean | Promise<boolean>;

  /** Fetches raw jobs — no normalization here, that's Phase 8 */
  fetch(company: Company): Promise<RawJob[]>;
}

/** Lookup registry so the Scheduler (Phase 10) doesn't hardcode a switch statement */
export class ConnectorRegistry {
  private connectors: Connector[] = [];

  register(connector: Connector): void {
    this.connectors.push(connector);
  }

  async resolve(careersUrl: string): Promise<Connector | undefined> {
    for (const connector of this.connectors) {
      if (await connector.canHandle(careersUrl)) return connector;
    }
    return undefined;
  }

  list(): Connector[] {
    return [...this.connectors];
  }
}
