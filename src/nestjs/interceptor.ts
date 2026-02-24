import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsCollector } from '../core/collector';
import { MetricsOptions } from '../core/types';
import { MetricsExtractor } from '../core/utils';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(
    private readonly collector: MetricsCollector,
    @Inject('METRICS_OPTIONS') private readonly options: MetricsOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType();
    if (type !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const res = httpContext.getResponse();

    const startTime = Date.now();
    const requestId = req.id || (req as any).requestId || uuidv4();
    // Ensure request ID is attached for downstream usage if it wasn't there
    if (!req.id && !(req as any).requestId) {
      (req as any).requestId = requestId;
    }

    const method = req.method;
    const url = req.url || req.originalUrl;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    let requestSize = 0;
    if (req.headers && req.headers['content-length']) {
      requestSize = parseInt(req.headers['content-length'], 10);
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        // Calculate response size if not available in headers
        if (!res.getHeader || !res.getHeader('content-length')) {
          // We can try to calculate it from data
          // But MetricsExtractor logic for responseSize relies on headers or passed in value?
          // MetricsExtractor uses headers.
          // We should probably help it if we have the data object here.
          // However, MetricsExtractor implementation currently only looks at headers for responseSize.
          // Use the helper method for manual calculation if header is missing
          // Actually, let's look at MetricsExtractor again. It only looks at headers.
          // The previous NestJS implementation tried to calculate it from `data`.
          // We should probably update MetricsExtractor or manually pass it if feasible.
          // But MetricsExtractor.extract doesn't take responseSize as argument.
          // Let's rely on standard headers for now or accept that we might miss size if not set.
          // Actually, wait, the previous implementation did manual calculation.
          // I should probably pass the calculated size if I can, OR update MetricsExtractor to handle it?
          // MetricsExtractor doesn't take custom size.
          // Let's modify MetricsExtractor or...
          // Wait, I can just set the header if it's missing on the response object before calling extract?
          // That might be side-effecty.
          // Alternative: Update MetricsExtractor to accept optional overrides?
          // Or just leave it as is.
          // The previous implementation for Fastify also only looked at headers. Express too.
          // Only NestJS interceptor had this extra logic for data.
          // Let's keep the manual calculation logic but maybe utilize `MetricsExtractor.calculateResponseSize`.
          // But how to pass it to `extract`?
          // `extract` calculates it internally.
        }

        // If we want to support capturing response size from body, we should probably update MetricsExtractor
        // to allow passing it, or just let it be.
        // For now, let's just call extract.
        // If the user really needs that manual calculation I might have dropped a feature.
        // The implementation plan said "Safely handle JSON.stringify...".
        // I implemented `calculateResponseSize` in `MetricsExtractor` but `extract` doesn't use it.
        // I should update `MetricsExtractor` to take an optional `responseBody` or `responseSize` arg?
        // Or I can just manually assign it to the metric after extraction.

        const metric = MetricsExtractor.extract(this.options, req, res, duration, requestId);

        // Polyfill response size if it was 0 and we have data
        if (metric.responseSize === 0 && data) {
          metric.responseSize = MetricsExtractor.calculateResponseSize(data);
        }

        this.collector.add(metric);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        let statusCode = 500;
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
        }

        // We can't reuse MetricsExtractor easily here because it defaults to 200 or res.statusCode
        // and we want to enforce the error status code.
        // Also we want to attach the error message.

        // Actually we CAN use it, and then override.

        // Mock a response object with the error status code?
        // Or just extract and override.

        const metric = MetricsExtractor.extract(
          this.options,
          req,
          { ...res, statusCode },
          duration,
          requestId,
        );
        metric.statusCode = statusCode; // Ensure it's correct
        metric.error = error.message;

        this.collector.add(metric);

        return throwError(() => error);
      }),
    );
  }
}
