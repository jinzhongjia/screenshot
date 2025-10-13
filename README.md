# Screenshot Service

High-performance website screenshot toolkit powered by [Bun](https://bun.sh) and [Puppeteer](https://pptr.dev). The project bundles an API server, TypeScript/JavaScript library, and rich examples so you can capture, transform, and automate page screenshots at scale.

> Looking for Chinese documentation? See [README.zh-CN.md](./README.zh-CN.md).

## Features

- Capture webpages as `webp`, `png`, or `jpeg`
- Extract page metadata (title, description) alongside images
- Device emulation presets (mobile, tablet, desktop) and custom viewports
- Advanced flows: element-only capture, clipping, dark mode, geolocation, form filling, script/CSS injection
- Built-in caching support for repeated screenshots
- First-class API server with health check and optional demo UI
- Docker image and compose setup for quick deployment
- Extensive TypeScript types and usage examples

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- Chromium dependencies (see `Dockerfile` for a complete list)

### Install & Run Locally

```bash
bun install

# Development mode with hot reload
bun run dev

# Production server
bun run start
```

The API server listens on `http://localhost:3000` by default. A demo UI is available at `/` when `ENABLE_DEMO` is `true`.

### Build Artifacts

```bash
# Compile library to ./dist and server binaries
bun run build

# Generate TypeScript declarations only
bun run build:lib

# Generate standalone binaries
bun run build:binary
```

## Project Structure

```text
src/
├── core/            # Screenshot engines (basic & enhanced)
├── server/          # API server and entrypoint
├── types/           # Shared TypeScript definitions
└── index.ts         # Library export surface
examples/            # Usage demos for API and advanced features
public/              # Demo web UI served at /
test/                # Bun test suites
```

## Library Usage

### Basic Screenshot

```ts
import { createScreenshotService } from '@screenshot/service';

const service = createScreenshotService();

const result = await service.capture({
  url: 'https://example.com',
  width: 1280,
  height: 720,
  type: 'png',
});

if (result.success && result.screenshot) {
  await Bun.write('example.png', result.screenshot);
}

await service.close();
```

### Enhanced Workflows

```ts
import { createEnhancedScreenshotService } from '@screenshot/service';

const service = createEnhancedScreenshotService();

await service.capture({
  url: 'https://github.com',
  fullPage: true,
  darkMode: true,
  device: 'Desktop 4K',
  actions: {
    waitForSelector: '.header',
    injectCSS: 'body { zoom: 0.9; }',
  },
});

await service.close();
```

Refer to `examples/` for full scripts covering caching, authentication, geolocation, and more.

## API Reference

### Endpoints

- `GET /health`: returns `{ status: 'healthy' | 'unhealthy', timestamp }`
- `POST /screenshot`: accepts a JSON payload and supports the optional `format` query parameter

### Request Payload Example

```jsonc
{
  "url": "https://example.com",
  "width": 1280,
  "height": 720,
  "fullPage": false,
  "type": "webp",
  "device": "iPhone 12",
  "actions": {
    "waitForSelector": "#hero",
    "hideElements": [".ads"],
  },
  "format": "json",
}
```

### Response Formats

- `format=json`: returns metadata, title, description, and a Base64-encoded screenshot payload
- `format=image`: streams the binary image with the appropriate `Content-Type`

Request example:

```bash
curl -X POST http://localhost:3000/screenshot \
  -H 'Content-Type: application/json' \
  -d '{
        "url": "https://example.com",
        "fullPage": true,
        "format": "json"
      }'
```

## Configuration

Control runtime behavior via environment variables:

| Variable                    | Default        | Description                                               |
| --------------------------- | -------------- | --------------------------------------------------------- |
| `PORT`                      | `3000`         | HTTP port                                                 |
| `HOST`                      | `localhost`    | Bind address                                              |
| `CORS`                      | `true`         | Enables CORS headers                                      |
| `ENABLE_DEMO`               | `true`         | Serves the interactive demo UI                            |
| `HEADLESS`                  | `true`         | Launches the browser in headless mode                     |
| `TIMEOUT`                   | `30000`        | Default page load timeout (ms)                            |
| `PUPPETEER_EXECUTABLE_PATH` | auto-detect    | Custom Chromium path (Docker default `/usr/bin/chromium`) |
| `ACQUIRE_TIMEOUT`           | `0` (disabled) | Max wait time when borrowing a browser from the pool (ms) |
| `KEEP_ALIVE`                | `0` (disabled) | Idle browser lifetime before automatic shutdown (ms)      |
| `MAX_PAGES_PER_BROWSER`     | `0` (disabled) | Max concurrent pages per browser instance                 |
| `MAX_BROWSERS_PER_CONFIG`   | `0` (disabled) | Max browsers for a single configuration key               |
| `MAX_TOTAL_BROWSERS`        | `4`            | Global cap across all pools                               |
| `POOL_ACQUIRE_TIMEOUT`      | `30000`        | Default wait time shared by all configs (ms)              |
| `POOL_KEEP_ALIVE`           | `60000`        | Idle close timeout shared by all configs (ms)             |

When bootstrapping via `ApiServer` or `createScreenshotService`, you can pass additional browser settings through `ServerConfig.browser`.

### API Server Usage

The built-in `ApiServer` exposes only two endpoints by default:

- `GET /health`: readiness probe
- `POST /screenshot`: screenshot API (supports `OPTIONS` for CORS)

You can extend the server by providing custom routes. Each route receives the request along with the server config and an instance of `ScreenshotService`.

```ts
import { ApiServer } from '@jinzhongjia/screenshot';

const server = new ApiServer({
  port: 8080,
  routes: [
    {
      path: '/version',
      methods: 'GET',
      handler: async (_req, { config }) =>
        new Response(JSON.stringify({ version: '0.0.2', port: config.port }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  ],
});

await server.start();
```

This makes it easy to plug the screenshot service into other frameworks or servers while keeping the core API minimal.

### Browser Pooling

The service reuses Chromium instances via a configurable pool:

- `BrowserConfig.poolKey` lets you group requests that should share the same pool.
- `maxPagesPerBrowser` and `maxBrowsersPerConfig` control per-config fan-out.
- `BrowserConfig.keepAliveMillis` or the global `pool.keepAliveMillis` specify how long idle browsers stay alive.
- Use `browser.acquireTimeout` or `pool.acquireTimeout` to bound how long a request waits when pools are saturated.

Example:

```ts
const service = createScreenshotService({
  args: ['--no-sandbox'],
  poolKey: 'default',
  maxPagesPerBrowser: 2,
  keepAliveMillis: 15000,
});

await service.capture({
  url: 'https://example.com',
  browser: {
    args: ['--disable-gpu'],
    poolKey: 'gpu-disabled',
    acquireTimeout: 5000,
  },
});
```

## Docker & Deployment

Build and run with Docker:

```bash
docker build -t screenshot-service .
docker run -p 3000:3000 screenshot-service
```

Or use docker-compose:

```bash
docker compose up --build
```

The provided `Dockerfile` and `docker-compose.yml` include dependency installation and health checks.

## Quality & Testing

```bash
# Format check
bun run format:check

# ESLint
bun run lint

# Combined checks
bun run check

# Test suites
bun test
```

## Contributing

Read `CONTRIBUTING.md` for guidelines on project standards, workflows, and code style.

## License

MIT License © Project contributors

"Project repository: https://github.com/jinzhongjia/screenshot"
