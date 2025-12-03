/**
 * Basic usage examples
 */

import { createScreenshotService, ScreenshotService } from '../src';
import type { ScreenshotOptions, ScreenshotResult } from '../src';

// Example 1: Simple screenshot
async function simpleCapture() {
  console.log('📸 Example 1: Simple screenshot');

  const service = createScreenshotService();

  const result = await service.capture({
    url: 'https://example.com',
    width: 1920,
    height: 1080,
  });

  if (result.success) {
    console.log('✅ Screenshot successful');
    console.log('   Title:', result.title);
    console.log('   Description:', result.description);
    console.log('   Size:', result.metadata?.size, 'bytes');

    // Save to file
    await Bun.write('example-simple.webp', result.screenshot!);
  } else {
    console.error('❌ Screenshot failed:', result.error);
  }

  await service.close();
}

// Example 2: Full page screenshot
async function fullPageCapture() {
  console.log('\n📸 Example 2: Full page screenshot');

  const service = new ScreenshotService({
    headless: true,
    defaultTimeout: 60000,
  });

  const result = await service.capture({
    url: 'https://github.com',
    fullPage: true,
    type: 'png',
  });

  if (result.success) {
    console.log('✅ Full page screenshot successful');
    console.log('   Actual dimensions:', `${result.metadata?.width}x${result.metadata?.height}`);

    await Bun.write('github-fullpage.png', result.screenshot!);
  }

  await service.close();
}

// Example 3: Batch screenshot
async function batchCapture() {
  console.log('\n📸 Example 3: Batch screenshot');

  const urls = ['https://example.com', 'https://bun.sh', 'https://www.typescriptlang.org'];

  const service = createScreenshotService();
  const results: ScreenshotResult[] = [];

  for (const url of urls) {
    console.log(`   Capturing: ${url}`);

    const result = await service.capture({
      url,
      width: 1280,
      height: 720,
      type: 'jpeg',
      quality: 85,
    });

    results.push(result);

    if (result.success) {
      const filename = `batch-${url.replace(/[^a-z0-9]/gi, '_')}.jpeg`;
      await Bun.write(filename, result.screenshot!);
      console.log(`   ✅ Saved: ${filename}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  await service.close();

  // Statistics
  const successful = results.filter((r) => r.success).length;
  console.log(`\n📊 Batch capture completed: ${successful}/${urls.length} successful`);
}

// Example 4: Custom configuration
async function customConfig() {
  console.log('\n📸 Example 4: Custom configuration');

  const service = new ScreenshotService({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultTimeout: 45000,
  });

  const options: ScreenshotOptions = {
    url: 'https://www.google.com',
    width: 1440,
    height: 900,
    type: 'webp',
    quality: 95,
    waitUntil: 'networkidle0',
    timeout: 30000,
  };

  const result = await service.capture(options);

  if (result.success) {
    console.log('✅ Custom config screenshot successful');
    console.log('   Format:', result.metadata?.format);
    console.log('   Size:', Math.round(result.metadata!.size / 1024), 'KB');

    await Bun.write('google-custom.webp', result.screenshot!);
  }

  await service.close();
}

// Example 5: Error handling
async function errorHandling() {
  console.log('\n📸 Example 5: Error handling');

  const service = createScreenshotService();

  // Test invalid URL
  const result = await service.capture({
    url: 'not-a-valid-url',
    width: 1920,
    height: 1080,
  });

  if (!result.success) {
    console.log('✅ Invalid URL handled correctly:', result.error);
  }

  // Test timeout
  const timeoutResult = await service.capture({
    url: 'https://httpstat.us/200?sleep=60000',
    timeout: 5000,
  });

  if (!timeoutResult.success) {
    console.log('✅ Timeout handled correctly:', timeoutResult.error);
  }

  await service.close();
}

// Main function
async function main() {
  console.log('🚀 Screenshot Service Usage Examples\n');
  console.log('='.repeat(50));

  try {
    await simpleCapture();
    await fullPageCapture();
    await batchCapture();
    await customConfig();
    await errorHandling();

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
