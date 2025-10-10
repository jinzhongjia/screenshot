#!/usr/bin/env bun

/**
 * Screenshot CLI Tool
 */

import { createScreenshotService } from '../core/screenshot';
import type { ScreenshotOptions } from '../types';

interface CliOptions {
  url: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  output?: string;
  format?: 'webp' | 'jpeg' | 'png';
  quality?: number;
  timeout?: number;
  apiUrl?: string;
  useApi?: boolean;
}

/**
 * 解析命令行参数
 */
function parseArgs(): CliOptions | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📷 Screenshot CLI

Usage:
  screenshot <url> [options]

Arguments:
  url                     URL to capture (required)

Options:
  --width <number>        Viewport width (default: 1920)
  --height <number>       Viewport height (default: 1080)
  --full-page            Capture full page
  --format <type>        Output format: webp, jpeg, png (default: webp)
  --quality <number>     Image quality 1-100 (default: 90)
  --output <file>        Output filename (default: screenshot-<timestamp>.<format>)
  --timeout <ms>         Timeout in milliseconds (default: 30000)
  --api-url <url>        Use remote API instead of local capture
  --use-api              Use remote API (default URL: http://localhost:3000)
  -h, --help            Show help

Examples:
  # Local capture
  screenshot https://example.com
  screenshot https://example.com --width 1280 --height 720
  screenshot https://github.com --full-page --output github.png --format png

  # Using remote API
  screenshot https://example.com --use-api
  screenshot https://example.com --api-url https://api.example.com/screenshot
`);
    return null;
  }

  if (!args[0]) {
    console.error('❌ Error: URL is required');
    return null;
  }

  const options: CliOptions = {
    url: args[0],
    format: 'webp',
    quality: 90,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--width':
        if (nextArg) {
          options.width = parseInt(nextArg);
          i++;
        }
        break;
      case '--height':
        if (nextArg) {
          options.height = parseInt(nextArg);
          i++;
        }
        break;
      case '--full-page':
        options.fullPage = true;
        break;
      case '--format':
        if (nextArg && ['webp', 'jpeg', 'png'].includes(nextArg)) {
          options.format = nextArg as 'webp' | 'jpeg' | 'png';
          i++;
        }
        break;
      case '--quality':
        if (nextArg) {
          options.quality = parseInt(nextArg);
          i++;
        }
        break;
      case '--output':
        if (nextArg) {
          options.output = nextArg;
          i++;
        }
        break;
      case '--timeout':
        if (nextArg) {
          options.timeout = parseInt(nextArg);
          i++;
        }
        break;
      case '--api-url':
        if (nextArg) {
          options.apiUrl = nextArg;
          options.useApi = true;
          i++;
        }
        break;
      case '--use-api':
        options.useApi = true;
        break;
    }
  }

  return options;
}

/**
 * 使用本地服务截图
 */
async function captureLocal(options: CliOptions): Promise<void> {
  const service = createScreenshotService();

  try {
    console.log('📸 Capturing screenshot locally...');
    console.log(`   URL: ${options.url}`);
    if (options.width) {
      console.log(`   Width: ${options.width}px`);
    }
    if (options.height) {
      console.log(`   Height: ${options.height}px`);
    }
    if (options.fullPage) {
      console.log(`   Mode: Full page`);
    }
    console.log(`   Format: ${options.format}`);
    console.log();

    const screenshotOptions: ScreenshotOptions = {
      url: options.url,
      width: options.width,
      height: options.height,
      fullPage: options.fullPage,
      quality: options.quality,
      type: options.format,
      timeout: options.timeout,
    };

    const result = await service.capture(screenshotOptions);

    if (!result.success) {
      console.error(`❌ Capture failed: ${result.error}`);
      process.exit(1);
    }

    if (!result.screenshot) {
      console.error('❌ No screenshot data');
      process.exit(1);
    }

    // 保存截图
    const filename = options.output || `screenshot-${Date.now()}.${options.format}`;
    await Bun.write(filename, result.screenshot);

    console.log('✅ Screenshot captured successfully!');
    console.log();
    console.log(`📄 Title: ${result.title || '(none)'}`);
    console.log(`📝 Description: ${result.description || '(none)'}`);
    console.log(`💾 File: ${filename}`);
    if (result.metadata) {
      console.log(`📐 Size: ${result.metadata.width}x${result.metadata.height}px`);
      console.log(`📦 File size: ${Math.round(result.metadata.size / 1024)} KB`);
    }
  } finally {
    await service.close();
  }
}

/**
 * 使用远程 API 截图
 */
async function captureViaApi(options: CliOptions): Promise<void> {
  const apiUrl =
    options.apiUrl || process.env.SCREENSHOT_API_URL || 'http://localhost:3000/screenshot';

  console.log('📸 Capturing screenshot via API...');
  console.log(`   API: ${apiUrl}`);
  console.log(`   URL: ${options.url}`);
  if (options.width) {
    console.log(`   Width: ${options.width}px`);
  }
  if (options.height) {
    console.log(`   Height: ${options.height}px`);
  }
  if (options.fullPage) {
    console.log(`   Mode: Full page`);
  }
  console.log();

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: options.url,
        width: options.width,
        height: options.height,
        fullPage: options.fullPage,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ API error: ${error.error}`);
      process.exit(1);
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ Capture failed: ${result.error}`);
      process.exit(1);
    }

    if (!result.screenshot) {
      console.error('❌ No screenshot data');
      process.exit(1);
    }

    // 保存截图
    const buffer = Buffer.from(result.screenshot, 'base64');
    const filename = options.output || `screenshot-${Date.now()}.webp`;
    await Bun.write(filename, buffer);

    console.log('✅ Screenshot captured successfully!');
    console.log();
    console.log(`📄 Title: ${result.title || '(none)'}`);
    console.log(`📝 Description: ${result.description || '(none)'}`);
    console.log(`💾 File: ${filename}`);
    if (result.metadata) {
      console.log(`📐 Size: ${result.metadata.width}x${result.metadata.height}px`);
      console.log(`📦 File size: ${Math.round(result.metadata.size / 1024)} KB`);
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log();
    console.log('💡 Tip: Make sure the API server is running');
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const options = parseArgs();
  if (!options) {
    return;
  }

  if (options.useApi) {
    await captureViaApi(options);
  } else {
    await captureLocal(options);
  }
}

// 运行 CLI
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
