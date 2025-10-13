/**
 * Demo Server - Using Bun's Fullstack API
 *
 * A simple demo server that showcases the screenshot service capabilities
 */

// import demo html
import homepage from '../../public/demo.html';
import { EnhancedScreenshotService } from '../core/screenshot-enhanced';
import type { ScreenshotOptions } from '../types';
import { DEVICE_PRESETS } from '../core/devices';

// Server configuration from environment variables
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || 'localhost';
const HEADLESS = process.env.HEADLESS !== 'false';
const DEFAULT_TIMEOUT = parseInt(process.env.TIMEOUT || '30000');

// Create screenshot service instance
const screenshotService = new EnhancedScreenshotService({
  headless: HEADLESS,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  defaultTimeout: DEFAULT_TIMEOUT,
  acquireTimeout: parseInt(process.env.ACQUIRE_TIMEOUT || '0') || undefined,
  keepAliveMillis: parseInt(process.env.KEEP_ALIVE || '0') || undefined,
  maxPagesPerBrowser: parseInt(process.env.MAX_PAGES_PER_BROWSER || '0') || undefined,
  maxBrowsersPerConfig: parseInt(process.env.MAX_BROWSERS_PER_CONFIG || '0') || undefined,
});

/**
 * Main server setup using Bun's fullstack routes API
 */
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  development: process.env.NODE_ENV !== 'production',

  // Routes mapping - Bun's fullstack API way
  routes: {
    // Serve demo HTML page at root
    '/': homepage,

    // Health check endpoint
    '/health': {
      async GET() {
        const isReady = await screenshotService.isReady();

        return Response.json(
          { status: isReady ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString() },
          { status: isReady ? 200 : 503 }
        );
      },
    },

    // Devices list endpoint
    '/devices': {
      async GET() {
        // Group devices by category
        const grouped = {
          iPhone: [] as Array<{ name: string; width: number; height: number }>,
          iPad: [] as Array<{ name: string; width: number; height: number }>,
          'Google Pixel': [] as Array<{ name: string; width: number; height: number }>,
          'Samsung Galaxy S': [] as Array<{ name: string; width: number; height: number }>,
          'Other Android': [] as Array<{ name: string; width: number; height: number }>,
          Desktop: [] as Array<{ name: string; width: number; height: number }>,
        };

        // Categorize devices
        for (const [name, device] of Object.entries(DEVICE_PRESETS)) {
          const deviceInfo = {
            name: device.name,
            width: device.viewport.width,
            height: device.viewport.height,
          };

          if (name.includes('iPhone')) {
            grouped.iPhone.push(deviceInfo);
          } else if (name.includes('iPad')) {
            grouped.iPad.push(deviceInfo);
          } else if (name.includes('Pixel')) {
            grouped['Google Pixel'].push(deviceInfo);
          } else if (name.includes('Samsung Galaxy S')) {
            grouped['Samsung Galaxy S'].push(deviceInfo);
          } else if (
            name.includes('OnePlus') ||
            name.includes('Xiaomi') ||
            name.includes('Samsung Galaxy Tab')
          ) {
            grouped['Other Android'].push(deviceInfo);
          } else if (name.includes('Desktop') || name.includes('MacBook') || name.includes('Laptop')) {
            grouped.Desktop.push(deviceInfo);
          }
        }

        return Response.json({
          success: true,
          devices: grouped,
        });
      },
    },

    // Screenshot API endpoint
    '/screenshot': {
      // Handle screenshot requests
      async POST(req) {
        try {
          const body = (await req.json()) as {
            url: string;
            width?: number;
            height?: number;
            fullPage?: boolean;
            device?: string;
            quality?: number;
            format?: 'json' | 'image';
          };

          const { format = 'json', ...screenshotOptions } = body;

          if (!screenshotOptions.url) {
            return Response.json({ error: 'URL is required' }, { status: 400 });
          }

          // Capture screenshot
          const result = await screenshotService.capture(screenshotOptions as ScreenshotOptions);

          if (!result.success) {
            return Response.json({ error: result.error }, { status: 500 });
          }

          // Return image format
          if (format === 'image') {
            const contentType =
              result.metadata?.format === 'png'
                ? 'image/png'
                : result.metadata?.format === 'jpeg'
                  ? 'image/jpeg'
                  : 'image/webp';

            return new Response(result.screenshot as BodyInit, {
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="screenshot.${result.metadata?.format}"`,
              },
            });
          }

          // Return JSON format
          return Response.json({
            success: true,
            title: result.title,
            description: result.description,
            screenshot: result.screenshot?.toString('base64'),
            metadata: result.metadata,
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 400 }
          );
        }
      },
    },
  },
});

console.log(`Screenshot Demo Server running at http://${HOST}:${PORT}`);
console.log(`Health: http://${HOST}:${PORT}/health`);
console.log(`API: http://${HOST}:${PORT}/screenshot`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  server.stop();
  await screenshotService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  server.stop();
  await screenshotService.close();
  process.exit(0);
});
