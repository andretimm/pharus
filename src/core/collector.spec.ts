import { MetricsCollector } from './collector';
import { HttpTransport } from './transport';

jest.mock('./transport');

describe('MetricsCollector', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    (MetricsCollector as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('should throw if getInstance is called before initialize', () => {
    expect(() => MetricsCollector.getInstance()).toThrow('MetricsCollector not initialized');
  });

  it('should initialize correctly as a singleton', () => {
    const options = {
      apiKey: 'test-api-key',
      ingestUrl: 'http://test.url/ingest',
      projectId: 'test-project',
      enabled: false, // Prevent interval start
    };

    const collector1 = MetricsCollector.initialize(options);
    const collector2 = MetricsCollector.getInstance();

    expect(collector1).toBeDefined();
    expect(collector1).toBe(collector2);
  });

  it('should add metrics to buffer and not flush if below batch size', () => {
    const options = {
      apiKey: 'test-api-key',
      ingestUrl: 'http://test.url/ingest',
      projectId: 'test-project',
      batchSize: 5,
      enabled: true,
    };

    const collector = MetricsCollector.initialize(options);

    // add a metric
    collector.add({
      projectId: 'test-project',
      duration: 100,
      requestSize: 100,
      responseSize: 100,
      route: '/test',
      method: 'GET',
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });

    // Check if transport send was NOT called
    const mockTransportInstance = (HttpTransport as jest.Mock).mock.instances[0];
    expect(mockTransportInstance.send).not.toHaveBeenCalled();

    // clear interval
    void collector.shutdown();
  });
});
