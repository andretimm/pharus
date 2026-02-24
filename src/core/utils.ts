import { Metric, MetricsOptions } from './types';
import { v4 as uuidv4 } from 'uuid';

export class MetricsExtractor {
  // Default regex for sensitive keys: password, passwd, secret, token, auth, apiKey, creditCard, cvv (case insensitive)
  private static readonly DEFAULT_SENSITIVE_REGEX =
    /pass(word|wd)?|secret|token|auth|api[._-]?key|credit[._-]?card|cvv|ccv|ssn/i;

  static extract(
    options: MetricsOptions,
    req: any,
    res: any,
    duration: number,
    requestId?: string,
  ): Metric {
    //const id = requestId || req.id || req.requestId || uuidv4();
    //TODO
    // const id = uuidv4();
    const method = req.method;
    const url = req.url || req.originalUrl || req.path;
    const ip =
      req.ip ||
      req.socket?.remoteAddress ||
      (req.headers ? req.headers['x-forwarded-for'] : undefined);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;

    // Determine Status Code
    let statusCode = 200;
    if (res.statusCode) {
      statusCode = res.statusCode;
    } else if (res.raw && res.raw.statusCode) {
      statusCode = res.raw.statusCode;
    }

    // Request Size
    let requestSize = 0;
    if (req.headers && req.headers['content-length']) {
      requestSize = parseInt(req.headers['content-length'], 10);
    }

    // Response Size
    let responseSize = 0;
    const contentLength = res.getHeader
      ? res.getHeader('content-length')
      : res.headers
        ? res.headers['content-length']
        : null;
    if (contentLength) {
      responseSize = parseInt(contentLength as string, 10);
    }

    // Route Pattern extraction (Try different properties for Express, Fastify, NestJS)
    let route = undefined;
    if (req.route && req.route.path) {
      route = req.route.path; // Express
    } else if (req.routeOptions && req.routeOptions.url) {
      route = req.routeOptions.url; // Fastify
    } else if (req.routerPath) {
      route = req.routerPath; // Fastify
    }

    const metric: Metric = {
      // id,
      // path: url,
      route,
      method,
      statusCode,
      duration,
      requestSize,
      responseSize,
      timestamp: new Date().toISOString(),
      userAgent,
      ip,
      projectId: options.projectId,
    };

    //TODO
    // const sensitiveRegex = options.sensitiveKeysRegex || MetricsExtractor.DEFAULT_SENSITIVE_REGEX;

    // if (options.captureBody && req.body) {
    //     metric.body = MetricsExtractor.redact(req.body, sensitiveRegex);
    // }

    // if (options.captureQuery && req.query) {
    //     metric.query = MetricsExtractor.redact(req.query, sensitiveRegex);
    // }

    // if (options.captureParams && req.params) {
    //     metric.params = MetricsExtractor.redact(req.params, sensitiveRegex);
    // }

    return metric;
  }

  static calculateResponseSize(data: any): number {
    if (!data) return 0;
    if (typeof data === 'string') {
      return Buffer.byteLength(data);
    }
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    try {
      return Buffer.byteLength(JSON.stringify(data));
    } catch (e) {
      return 0;
    }
  }

  private static redact(data: any, regex: RegExp): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) {
      return data.map((item) => MetricsExtractor.redact(item, regex));
    }

    const redacted: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (regex.test(key)) {
          redacted[key] = '*****';
        } else {
          redacted[key] = MetricsExtractor.redact(data[key], regex);
        }
      }
    }
    return redacted;
  }
}
