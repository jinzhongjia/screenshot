/**
 * Enhanced features usage examples
 */

import { createEnhancedScreenshotService } from '../src';

// Create enhanced service instance
const service = createEnhancedScreenshotService({
  headless: true,
  defaultTimeout: 30000,
});

// Example 1: Mobile device emulation
async function mobileScreenshot() {
  console.log('📱 Example 1: iPhone 12 Pro screenshot');

  const result = await service.capture({
    url: 'https://example.com',
    device: 'iPhone 12 Pro',
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ Mobile device screenshot successful');
    console.log(`   Dimensions: ${result.metadata?.width}x${result.metadata?.height}`);
    await Bun.write('mobile-iphone12pro.webp', result.screenshot!);
  }
}

// Example 2: Element selector screenshot
async function elementScreenshot() {
  console.log('\n🎯 Example 2: Capture specific element only');

  const result = await service.capture({
    url: 'https://github.com',
    selector: '.Header', // Only capture the page header
    type: 'png',
  });

  if (result.success) {
    console.log('✅ Element screenshot successful');
    await Bun.write('element-header.png', result.screenshot!);
  }
}

// Example 3: Screenshot after page actions
async function pageActionsScreenshot() {
  console.log('\n🎬 Example 3: Screenshot after page actions');

  const result = await service.capture({
    url: 'https://example.com',
    actions: {
      // Wait for page to load
      waitForSelector: 'h1',
      // Inject custom CSS
      injectCSS: `
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        h1 {
          font-size: 48px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
      `,
      // Hide certain elements
      hideElements: ['.advertisement', '.cookie-banner'],
      // Delay 1 second
      delay: 1000,
    },
  });

  if (result.success) {
    console.log('✅ Page actions screenshot successful');
    await Bun.write('page-actions.webp', result.screenshot!);
  }
}

// Example 4: Authenticated page screenshot
async function authenticatedScreenshot() {
  console.log('\n🔐 Example 4: Authenticated page screenshot');

  const result = await service.capture({
    url: 'https://httpbin.org/basic-auth/user/pass',
    auth: {
      basic: {
        username: 'user',
        password: 'pass',
      },
    },
  });

  if (result.success) {
    console.log('✅ Authenticated page screenshot successful');
    console.log('   Title:', result.title);
    await Bun.write('authenticated.webp', result.screenshot!);
  }
}

// Example 5: Full page PNG screenshot
async function fullPagePngScreenshot() {
  console.log('\n📄 Example 5: Full page PNG screenshot');

  const result = await service.capture({
    url: 'https://www.typescriptlang.org',
    type: 'png',
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ Full page PNG screenshot successful');
    console.log('   Size:', Math.round(result.metadata!.size / 1024), 'KB');
    await Bun.write('fullpage.png', result.screenshot!);
  }
}

// Example 6: Dark mode screenshot
async function darkModeScreenshot() {
  console.log('\n🌙 Example 6: Dark mode screenshot');

  const result = await service.capture({
    url: 'https://github.com',
    darkMode: true,
    width: 1920,
    height: 1080,
  });

  if (result.success) {
    console.log('✅ Dark mode screenshot successful');
    await Bun.write('dark-mode.webp', result.screenshot!);
  }
}

// Example 7: Geolocation emulation
async function geolocationScreenshot() {
  console.log('\n📍 Example 7: Geolocation emulation screenshot');

  const result = await service.capture({
    url: 'https://www.google.com/maps',
    geolocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 100,
    },
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
  });

  if (result.success) {
    console.log('✅ Geolocation emulation successful');
    await Bun.write('geolocation.webp', result.screenshot!);
  }
}

// Example 8: Custom viewport clipping
async function clipScreenshot() {
  console.log('\n✂️ Example 8: Custom clip region');

  const result = await service.capture({
    url: 'https://example.com',
    clip: {
      x: 100,
      y: 100,
      width: 800,
      height: 600,
    },
  });

  if (result.success) {
    console.log('✅ Clipped screenshot successful');
    console.log('   Clip dimensions: 800x600');
    await Bun.write('clipped.webp', result.screenshot!);
  }
}

// Example 9: Cached screenshot
async function cachedScreenshot() {
  console.log('\n💾 Example 9: Cached screenshot');

  // First request
  console.log('   First request...');
  let start = Date.now();
  let result = await service.capture({
    url: 'https://example.com',
    cacheKey: 'example-homepage',
    cacheTTL: 60, // Cache for 60 seconds
  });

  if (result.success) {
    console.log(`   ✅ Duration: ${Date.now() - start}ms`);
  }

  // Second request (should return from cache)
  console.log('   Second request (from cache)...');
  start = Date.now();
  result = await service.capture({
    url: 'https://example.com',
    cacheKey: 'example-homepage',
    cacheTTL: 60,
  });

  if (result.success) {
    console.log(`   ✅ Duration: ${Date.now() - start}ms (should be faster)`);
    await Bun.write('cached.webp', result.screenshot!);
  }
}

// Example 10: Form fill screenshot
async function formFillScreenshot() {
  console.log('\n📝 Example 10: Form fill screenshot');

  const result = await service.capture({
    url: 'https://github.com/login',
    actions: {
      waitForSelector: 'input[name="login"]',
      fillForm: [
        { selector: 'input[name="login"]', value: 'example@email.com' },
        { selector: 'input[name="password"]', value: 'password123' },
      ],
      delay: 1000,
    },
  });

  if (result.success) {
    console.log('✅ Form fill screenshot successful');
    await Bun.write('form-filled.webp', result.screenshot!);
  }
}

// Example 11: 4K resolution screenshot
async function highResScreenshot() {
  console.log('\n🖥️ Example 11: 4K resolution screenshot');

  const result = await service.capture({
    url: 'https://www.apple.com',
    device: 'Desktop 4K',
    type: 'jpeg',
    quality: 95,
  });

  if (result.success) {
    console.log('✅ 4K screenshot successful');
    console.log(`   Dimensions: ${result.metadata?.width}x${result.metadata?.height}`);
    console.log('   Size:', Math.round(result.metadata!.size / 1024), 'KB');
    await Bun.write('4k-screenshot.jpeg', result.screenshot!);
  }
}

// Example 12: Wait for element screenshot
async function waitForElementScreenshot() {
  console.log('\n⏳ Example 12: Wait for specific element');

  const result = await service.capture({
    url: 'https://example.com',
    actions: {
      // Wait for specific element to appear
      waitForSelector: 'footer',
      // Scroll to bottom
      scrollToElement: 'footer',
      // Wait for animation to complete
      delay: 2000,
      // Inject JS to execute
      injectJS: `
        document.querySelector('h1').innerText = 'Screenshot Service Demo';
        document.body.style.transition = 'all 0.5s ease';
      `,
    },
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ Wait for element screenshot successful');
    await Bun.write('wait-element.webp', result.screenshot!);
  }
}

// Main function
async function main() {
  console.log('🚀 Enhanced Screenshot Features Examples\n');
  console.log('='.repeat(50));

  try {
    await mobileScreenshot();
    await elementScreenshot();
    await pageActionsScreenshot();
    await authenticatedScreenshot();
    await fullPagePngScreenshot();
    await darkModeScreenshot();
    await geolocationScreenshot();
    await clipScreenshot();
    await cachedScreenshot();
    await formFillScreenshot();
    await highResScreenshot();
    await waitForElementScreenshot();

    console.log('\n✨ All enhanced feature examples completed!');

    // Clear cache
    service.clearCache();
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
  } finally {
    await service.close();
  }
}

// Run examples
if (import.meta.main) {
  main();
}
