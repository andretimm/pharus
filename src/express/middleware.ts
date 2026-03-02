import { Request, Response, NextFunction } from 'express';
import { MetricsCollector } from '../core/collector';
import { MetricsOptions } from '../core/types';
import { MetricsExtractor } from '../core/utils';
import { v4 as uuidv4 } from 'uuid';

export const metricsMiddleware = (options: MetricsOptions) => {
  const collector = MetricsCollector.initialize(options);

  return (req: Request, res: Response, next: NextFunction) => {
    if (options.enabled === false || req.method === 'OPTIONS') {
      return next();
    }

    const start = Date.now();
    const requestId = uuidv4();
    (req as any).requestId = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const metric = MetricsExtractor.extract(options, req, res, duration, requestId);
      collector.add(metric);
    });

    next();
  };
};
