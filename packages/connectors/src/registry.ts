import { ConnectorRegistry } from "./connector";
import { GreenhouseConnector } from "./greenhouse";

/** Pre-registers all MVP connectors so callers don't hardcode a switch statement */
export function createDefaultRegistry(): ConnectorRegistry {
  const registry = new ConnectorRegistry();
  registry.register(new GreenhouseConnector());
  return registry;
}
