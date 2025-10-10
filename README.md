# Screenshot Service

High-performance website screenshot toolkit powered by [Bun](https://bun.sh) and [Puppeteer](https://pptr.dev). The project bundles an API server, TypeScript/JavaScript library, CLI, and rich examples so you can capture, transform, and automate page screenshots at scale.

> Looking for Chinese documentation? See [README.zh-CN.md](./README.zh-CN.md).

## Features

- Capture webpages as `webp`, `png`, `jpeg`, or `pdf`
- Extract page metadata (title, description) alongside images
- Device emulation presets (mobile, tablet, desktop) and custom viewports
- Advanced flows: element-only capture, clipping, dark mode, geolocation, form filling, script/CSS injection
- Built-in caching support for repeated screenshots
- First-class API server with health check and optional demo UI
- CLI utility for local or remote (API) captures
- Docker image and compose setup for quick deployment

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
bun run build:cli-binary
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

Refer to `examples/` for full scripts covering caching, authentication, PDF generation, geolocation, and more.

## CLI Usage

Install binaries with `bun run build:cli-binary` or invoke via Bun:

```bash
# Display help
bun ./src/cli/index.ts --help

# Local capture
screenshot https://example.com --width 1440 --height 900

# Full page capture to PNG
screenshot https://github.com --full-page --format png --output github.png

# Use remote API endpoint
screenshot https://example.com --use-api --api-url https://api.example.com/screenshot
```

Supported flags include `--width`, `--height`, `--full-page`, `--format`, `--quality`, `--timeout`, `--output`, and API integration options.

## API Reference

### Endpoints

- `GET /health` — returns `{ status: 'healthy' | 'unhealthy', timestamp }`
- `POST /screenshot` — accepts JSON body with screenshot options and optional `format` field

### Request Body (JSON)

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
    "hideElements": [".ads"]
  },
  "format": "json" // or "image"
}
```

### Response

- `format=json`: returns metadata, title, description, and base64 screenshot payload
- `format=image`: returns raw image bytes with appropriate `Content-Type`

Example request:

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

Environment variables influence server behaviour:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `localhost` | Bind address |
| `CORS` | `true` | Enable `Access-Control-Allow-*` headers |
| `ENABLE_DEMO` | `true` | Serve demo UI from `public/demo.html` |
| `HEADLESS` | `true` | Launch Puppeteer in headless mode |
| `TIMEOUT` | `30000` | Default navigation timeout (ms) |
| `PUPPETEER_EXECUTABLE_PATH` | _auto_ | Override Chromium binary (Docker uses `/usr/bin/chromium`) |

Additional browser options can be passed via `ServerConfig.browser` when instantiating `ApiServer` or `createScreenshotService`.

## Docker & Deployment

Build and run with Docker:

```bash
docker build -t screenshot-service .
docker run -p 3000:3000 screenshot-service
```

or use docker-compose:

```bash
docker compose up --build
```

Health checks and required system dependencies are preconfigured in `docker-compose.yml` and `Dockerfile`.

## Quality & Testing

```bash
# Format check
bun run format:check

# Lint
bun run lint

# Run both checks
bun run check

# Execute test suite
bun test
```

## Project Structure

```text
src/
├── core/            # Screenshot engines (basic & enhanced)
├── server/          # API server and entrypoint
├── cli/             # CLI implementation
├── types/           # Shared TypeScript definitions
└── index.ts         # Library export surface
examples/            # Usage demos for API, CLI, advanced features
public/              # Demo web UI served at /
test/                # Bun test suites
```

## Contributing

We welcome contributions! Read [CONTRIBUTING.md](./CONTRIBUTING.md) to learn about project setup, coding standards, and workflow.

## License

MIT License © Contributors


