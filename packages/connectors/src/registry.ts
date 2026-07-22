import { ConnectorRegistry } from "./connector";
import { AshbyConnector } from "./ashby";
import { GreenhouseConnector } from "./greenhouse";
import { LeverConnector } from "./lever";
import {
  ReactRenderedConnector,
  type BrowserFetchHtmlFn,
} from "./react-rendered";
import { StaticHtmlConnector } from "./static-html";
import { WorkdayConnector } from "./workday";

export interface DefaultRegistryOptions {
  /** Injected Playwright/browser HTML fetch for `react-rendered` */
  browserFetchHtml?: BrowserFetchHtmlFn;
}

/**
 * Pre-registers all MVP connectors so callers don't hardcode a switch statement.
 * Fallback connectors (`static-html`, `react-rendered`) are selected by detected
 * `company.platform`, not URL `resolve()` — their `canHandle` returns false.
 */
export function createDefaultRegistry(
  options: DefaultRegistryOptions = {},
): ConnectorRegistry {
  const registry = new ConnectorRegistry();
  registry.register(new GreenhouseConnector());
  registry.register(new LeverConnector());
  registry.register(new AshbyConnector());
  registry.register(new WorkdayConnector());
  registry.register(new StaticHtmlConnector());

  if (options.browserFetchHtml) {
    registry.register(
      new ReactRenderedConnector({
        browserFetchHtml: options.browserFetchHtml,
      }),
    );
  }

  return registry;
}
