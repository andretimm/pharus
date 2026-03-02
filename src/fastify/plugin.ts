import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { v4 as uuidv4 } from 'uuid';
import { MetricsCollector } from '../core/collector';
import { MetricsOptions } from '../core/types';
import { MetricsExtractor } from '../core/utils';

const metricsPlugin: FastifyPluginAsync<MetricsOptions> = async (fastify, options) => {
  const collector = MetricsCollector.initialize(options);

  if (options.enabled === false) {
    return;
  }

  // Route Discovery disabled in favor of per-request capture

  fastify.addHook('onRequest', async (req, reply) => {
    (req as any).metricsStartTime = Date.now();
    if (!req.id) {
      req.id = uuidv4();
    }
  });

  fastify.addHook('onResponse', async (req, reply) => {
    if (req.method === 'OPTIONS') return;

    const start = (req as any).metricsStartTime || Date.now();
    const duration = Date.now() - start;

    // Fastify Request and Reply objects are compatible with MetricsExtractor's expectations
    // except we need to make sure we pass the right objects or properties if they differ significantly.
    // MetricsExtractor checks for req.routeOptions.url / req.routerPath which Fastify uses.

    const metric = MetricsExtractor.extract(options, req, reply, duration, req.id as string);
    collector.add(metric);
  });
};

export default fp(metricsPlugin, {
  name: 'metrics-plugin',
});
