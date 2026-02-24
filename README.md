# @andretimm/pharus

A framework-agnostic metrics collection library for Node.js applications. Designed to easily integrate with **Express**, **Fastify**, and **NestJS**. It automatically collects request and response metrics (such as latency, HTTP status codes, and payload sizes) and sends them to a configured ingestion endpoint.

## Key Features

- **Framework Agnostic:** Core logic separated from framework adapters (`express`, `fastify`, `nestjs`).
- **Automatic Collection:** Captures response duration, HTTP status code, request/response sizes, route, and HTTP method.
- **Optimized Batching:** Metrics are accumulated in memory and periodically sent in batches to reduce network overhead.
- **Highly Configurable:** Full control over batch size, auto-flush intervals, and captured data (body, query params, route params).
- **Native Security:** Built-in support for redacting sensitive data using regular expressions (e.g., passwords, tokens).

---

## 📦 Installation

You can install the package directly using npm or yarn:

```bash
npm install @andretimm/pharus
# or
yarn add @andretimm/pharus
```

---

## ⚙️ Configuration Options (`MetricsOptions`)

All integrations accept the same options interface:

| Property             | Type      | Required | Default | Description                                                                 |
| -------------------- | --------- | -------- | ------- | --------------------------------------------------------------------------- |
| `projectId`          | `string`  | **Yes**  | -       | The ID of the project associated with the metrics being sent.               |
| `ingestUrl`          | `string`  | **Yes**  | -       | The destination URL where metric batches will be ingested.                  |
| `batchSize`          | `number`  | No       | `50`    | Number of metrics to accumulate in memory before flushing the batch.        |
| `flushIntervalMs`    | `number`  | No       | `5000`  | Maximum time (in ms) to wait before automatically flushing the batch.       |
| `enabled`            | `boolean` | No       | `true`  | Enables or disables metric collection globally.                             |
| `captureBody`        | `boolean` | No       | `false` | Whether to capture the request `body` payload.                              |
| `captureQuery`       | `boolean` | No       | `false` | Whether to capture URL `query string` parameters.                           |
| `captureParams`      | `boolean` | No       | `false` | Whether to capture dynamic route parameters (e.g., `/user/:id`).            |
| `sensitiveKeysRegex` | `RegExp`  | No       | -       | Regular expression to hide/redact (replace with `*****`) sensitive keys.    |

---

## 🚀 Usage Guide by Framework

Below is how to configure and plug `@andretimm/pharus` into each of the main supported Node.js frameworks.

### 1. Express.js

Import the `metricsMiddleware` from the specific Express entry point.

**Important Notice**: If you want to capture request bodies (`captureBody: true`), you MUST register your body parsing middleware (e.g., `express.json()`) **before** adding the metrics middleware.

```typescript
import express from 'express';
import { metricsMiddleware } from '@andretimm/pharus/express';

const app = express();

// JSON Parsing (Required before metrics if using `captureBody: true`)
app.use(express.json());

// Registering the metrics middleware
app.use(metricsMiddleware({
  projectId: 'my-super-project',
  ingestUrl: 'https://my-metrics-api.com/ingest',
  captureBody: true,        // Optional: Captures request payloads
  batchSize: 10,            // Optional: Sends a batch every 10 processed requests
}));

app.get('/', (req, res) => {
  res.send('Metrics are being captured silently!');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
```

### 2. Fastify

The package exposes a plugin fully compatible with Fastify's internal ecosystem, safely handling the request/response lifecycle (`onRequest` and `onResponse`).

```typescript
import fastify from 'fastify';
import { metricsPlugin } from '@andretimm/pharus/fastify';

const app = fastify();

// Register the metrics plugin in Fastify
app.register(metricsPlugin, {
  projectId: 'my-super-project',
  ingestUrl: 'https://my-metrics-api.com/ingest',
  flushIntervalMs: 2000, // Optional: Ensures metrics are sent at least every 2 seconds
  captureQuery: true,    // Optional: Saves all query strings
});

app.get('/', async () => {
  return { hello: 'world' };
});

app.listen({ port: 3000 }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Fastify is running on port 3000');
});
```

### 3. NestJS

The package provides a native NestJS `MetricsModule`. Simply import the root module via `forRoot()` in your application, and it will automatically inject the global execution time and payload size `Interceptors`.

```typescript
import { Module } from '@nestjs/common';
import { MetricsModule } from '@andretimm/pharus/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Register the module globally
    MetricsModule.forRoot({
      projectId: 'my-super-project',
      ingestUrl: 'https://my-metrics-api.com/ingest',
      sensitiveKeysRegex: /password|token|secret|credit_card/i, // Redacts critical body data
      captureBody: true, 
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 🛡 Advanced Features

### Masking / Redacting Sensitive Data

One of the most useful features when logging full payloads is masking passwords or credit card data. You can control this using the `sensitiveKeysRegex` option.

```typescript
metricsMiddleware({
  // ... other initial options
  captureBody: true,
  sensitiveKeysRegex: /password|credit_card|cvc|secret_key/i
})
```

Any object or key in the extracted payload/parameters that matches the regular expression `/password|credit_card/i` will have its value replaced in memory with `"*****"` before being cached or sent to the metrics API.

### Manual / Forced Flush

In serverless environments (e.g., AWS Lambda) or during a **graceful shutdown** (cloud interruptions), Node might terminate your process before the `flushIntervalMs` triggers organically.

To ensure no in-memory data loss, you can leverage the core singleton:

```typescript
import { MetricsCollector } from '@andretimm/pharus';

const collector = MetricsCollector.getInstance();
await collector.flush(); // Forces an immediate push of all pending metrics
await collector.shutdown(); // And then, safely terminates the global dispatch loop
```

---

## 📜 License

This software is licensed under the [ISC License](./LICENSE).

