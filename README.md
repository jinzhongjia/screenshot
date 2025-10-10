# Screenshot Service

High-performance website screenshot toolkit powered by [Bun](https://bun.sh) and [Puppeteer](https://pptr.dev). The project bundles an API server, TypeScript/JavaScript library, and rich examples so you can capture, transform, and automate page screenshots at scale.

> Looking for Chinese documentation? See [README.zh-CN.md](./README.zh-CN.md).

## Features

- Capture webpages as `webp`, `png`, `jpeg`, or `pdf`
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

Refer to `examples/` for full scripts covering caching, authentication, PDF generation, geolocation, and more.

## API Reference

### Endpoints

- `