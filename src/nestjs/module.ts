import { DynamicModule, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsCollector } from '../core/collector';
import { MetricsOptions } from '../core/types';
import { MetricsInterceptor } from './interceptor';

@Global()
export class MetricsModule {
  static forRoot(options: MetricsOptions): DynamicModule {
    return {
      module: MetricsModule,
      providers: [
        {
          provide: 'METRICS_OPTIONS',
          useValue: options,
        },
        {
          provide: MetricsCollector,
          useFactory: (opts: MetricsOptions) => MetricsCollector.initialize(opts),
          inject: ['METRICS_OPTIONS'],
        },
        MetricsInterceptor,
        {
          provide: APP_INTERCEPTOR,
          useClass: MetricsInterceptor,
        },
      ],
      exports: [MetricsCollector, MetricsInterceptor],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<MetricsOptions> | MetricsOptions;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: MetricsModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'METRICS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: MetricsCollector,
          useFactory: (opts: MetricsOptions) => MetricsCollector.initialize(opts),
          inject: ['METRICS_OPTIONS'],
        },
        MetricsInterceptor,
        {
          provide: APP_INTERCEPTOR,
          useClass: MetricsInterceptor,
        },
      ],
      exports: [MetricsCollector, MetricsInterceptor],
    };
  }
}
