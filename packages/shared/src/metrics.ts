import { Registry, collectDefaultMetrics } from 'prom-client';

export function createMetricsRegistry(serviceName: string): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: registry });
  return registry;
}
