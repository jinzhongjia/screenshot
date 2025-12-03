/**
 * API client usage examples
 */

import type { ApiJsonResponse } from '../src';

// API configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Screenshot API client class
 */
class ScreenshotApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Capture webpage screenshot (returns JSON)
   */
  async captureAsJson(
    url: string,
    options?: {
      width?: number;
      height?: number;
      fullPage?: boolean;
    }
  ): Promise<ApiJsonResponse> {
    const response = await fetch(`${this.baseUrl}/screenshot`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        url,
        ...options,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Capture webpage screenshot (returns image binary)
   */
  async captureAsImage(
    url: string,
    options?: {
      width?: number;
      height?: number;
      fullPage?: boolean;
    }
  ): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/screenshot`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        url,
        ...options,
        format: 'image',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Usage examples

async function jsonExample() {
  console.log('📸 JSON format response example');

  const client = new ScreenshotApiClient();

  try {
    const result = await client.captureAsJson('https://example.com', {
      width: 1920,
      height: 1080,
    });

    if (result.success) {
      console.log('✅ Screenshot successful');
      console.log('   Title:', result.title);
      console.log('   Description:', result.description);

      if (result.metadata) {
        console.log('   Dimensions:', `${result.metadata.width}x${result.metadata.height}`);
        console.log('   Size:', Math.round(result.metadata.size / 1024), 'KB');
      }

      // Save screenshot
      const buffer = Buffer.from(result.screenshot!, 'base64');
      await Bun.write('api-json-example.webp', buffer);
      console.log('   Saved: api-json-example.webp');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function imageExample() {
  console.log('\n📸 Image format response example');

  const client = new ScreenshotApiClient();

  try {
    const imageBuffer = await client.captureAsImage('https://github.com', {
      width: 1280,
      height: 720,
      fullPage: false,
    });

    console.log('✅ Image retrieved successfully');
    console.log('   Size:', Math.round(imageBuffer.length / 1024), 'KB');

    await Bun.write('api-image-example.webp', imageBuffer);
    console.log('   Saved: api-image-example.webp');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function batchApiCapture() {
  console.log('\n📸 Batch API call example');

  const client = new ScreenshotApiClient();
  const urls = ['https://example.com', 'https://bun.sh', 'https://www.typescriptlang.org'];

  // Parallel requests
  const promises = urls.map(async (url) => {
    try {
      const result = await client.captureAsJson(url, {
        width: 1280,
        height: 720,
      });

      if (result.success) {
        const filename = `api-batch-${url.replace(/[^a-z0-9]/gi, '_')}.webp`;
        const buffer = Buffer.from(result.screenshot!, 'base64');
        await Bun.write(filename, buffer);

        return {
          url,
          success: true,
          title: result.title,
          filename,
        };
      }

      return { url, success: false, error: result.error };
    } catch (error) {
      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const results = await Promise.all(promises);

  console.log('\n📊 Batch results:');
  results.forEach((result) => {
    if (result.success) {
      console.log(`   ✅ ${result.url}`);
      console.log(`      Title: ${result.title}`);
      console.log(`      File: ${result.filename}`);
    } else {
      console.log(`   ❌ ${result.url}: ${result.error}`);
    }
  });
}

async function healthCheckExample() {
  console.log('\n🏥 Health check example');

  const client = new ScreenshotApiClient();
  const isHealthy = await client.healthCheck();

  if (isHealthy) {
    console.log('✅ Service is healthy');
  } else {
    console.log('❌ Service is unavailable');
  }
}

// Create an advanced client with retry mechanism
class AdvancedScreenshotClient extends ScreenshotApiClient {
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseUrl: string = API_BASE_URL, maxRetries: number = 3, retryDelay: number = 1000) {
    super(baseUrl);
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async captureWithRetry(
    url: string,
    options?: any,
    retries: number = 0
  ): Promise<ApiJsonResponse> {
    try {
      return await this.captureAsJson(url, options);
    } catch (error) {
      if (retries < this.maxRetries) {
        console.log(`   Retry ${retries + 1}/${this.maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.captureWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }
}

async function advancedClientExample() {
  console.log('\n🚀 Advanced client example (with retry)');

  const client = new AdvancedScreenshotClient(API_BASE_URL, 3, 2000);

  try {
    const result = await client.captureWithRetry('https://example.com', {
      width: 1920,
      height: 1080,
    });

    if (result.success) {
      console.log('✅ Screenshot successful (possibly after retries)');
      console.log('   Title:', result.title);
    }
  } catch (error) {
    console.error('❌ Final failure (after retries):', error);
  }
}

// Main function
async function main() {
  console.log('🚀 Screenshot API Client Examples\n');
  console.log('='.repeat(50));

  // First check if service is available
  const client = new ScreenshotApiClient();
  const isHealthy = await client.healthCheck();

  if (!isHealthy) {
    console.log('⚠️  API service is unavailable, please start the service first:');
    console.log('   bun run dev');
    process.exit(1);
  }

  console.log('✅ API service is ready\n');

  try {
    await jsonExample();
    await imageExample();
    await batchApiCapture();
    await healthCheckExample();
    await advancedClientExample();

    console.log('\n✨ All examples completed!');
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    process.exit(1);
  }
}

// Run examples
if (import.meta.main) {
  main();
}
