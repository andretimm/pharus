export interface Metric {
  // path: string; // The actual URL path (e.g. /users/123)
  route?: string; // The route pattern (e.g. /users/:id)
  method: string;
  statusCode: number;
  // id: string; // Unique request ID (UUID)
  duration: number; // in milliseconds
  requestSize?: number; // in bytes
  responseSize?: number; // in bytes
  timestamp: string; // ISO string
  userAgent?: string;
  ip?: string;
  error?: string;
  metadata?: Record<string, any>;
  body?: any;
  query?: any;
  params?: any;
  projectId: string;
}

export interface MetricsOptions {
  ingestUrl: string;
  projectId: string;
  batchSize?: number;
  flushIntervalMs?: number;
  enabled?: boolean;
  captureBody?: boolean;
  captureQuery?: boolean;
  captureParams?: boolean;
  sensitiveKeysRegex?: RegExp;
}

export interface Route {
  path: string;
  method: string;
  metadata?: Record<string, any>;
}

export interface Transport {
  send(metrics: Metric[]): Promise<void>;
}
