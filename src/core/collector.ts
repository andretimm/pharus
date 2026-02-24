import { Metric, MetricsOptions, Transport } from './types';
import { HttpTransport } from './transport';

export class MetricsCollector {
  private static instance: MetricsCollector;
  private buffer: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly transport: Transport;
  private readonly enabled: boolean;
  private readonly projectId: string;

  private constructor(options: MetricsOptions) {
    this.batchSize = options.batchSize || 50;
    this.flushIntervalMs = options.flushIntervalMs || 5000;
    this.transport = new HttpTransport(options.ingestUrl);
    this.enabled = options.enabled !== false;
    this.projectId = options.projectId;

    if (this.enabled) {
      this.startFlushInterval();
    }
  }

  public static initialize(options: MetricsOptions): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector(options);
    }
    return MetricsCollector.instance;
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      throw new Error(
        'MetricsCollector not initialized. Call MetricsCollector.initialize() first.',
      );
    }
    return MetricsCollector.instance;
  }

  public add(metric: Metric): void {
    if (!this.enabled) return;

    this.buffer.push(metric);
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metricsToSend = [...this.buffer];
    this.buffer = []; // Clear buffer immediately

    await this.transport.send(metricsToSend);
  }

  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushInterval = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}
