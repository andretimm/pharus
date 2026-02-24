import axios from 'axios';
import { Metric, Transport } from './types';

export class HttpTransport implements Transport {
  constructor(private readonly ingestUrl: string) {}

  async send(metrics: Metric[]): Promise<void> {
    try {
      await axios.post(
        this.ingestUrl,
        { metrics },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );
      console.log('[Metrics] Metrics sent successfully');
    } catch (error) {
      console.log(error);
      // Silently fail or log to stderr to avoid crashing the app
      console.error(
        '[Metrics] Failed to send metrics:',
        axios.isAxiosError(error) ? error.message : error,
      );
    }
  }
}
