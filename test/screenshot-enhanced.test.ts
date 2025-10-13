import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { createEnhancedScreenshotService, EnhancedScreenshotService } from '../src';

describe('EnhancedScreenshotService - Cache', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService({
      headless: true,
      defaultTimeout: 30000,
    });
  });

  afterAll(async () => {
    await service.close();
  });

  test('should cache screenshot results with cacheTTL', async () => {
    const options = {
      url: 'https://example.com',
      width: 800,
      height: 600,
      cacheTTL: 60, // 60 seconds
    };

    // First call - should capture
    const result1 = await service.capture(options);
    expect(result1.success).toBe(true);
    expect(result1.screenshot).toBeInstanceOf(Buffer);

    // Second call - should use cache
    const result2 = await service.capture(options);
    expect(result2.success).toBe(true);
    expect(result2.screenshot).toBeInstanceOf(Buffer);
  }, 60000);

  test('should use custom cache key', async () => {
    const options = {
      url: 'https://example.com',
      cacheTTL: 60,
      cacheKey: 'my-custom-key',
    };

    const result1 = await service.capture(options);
    expect(result1.success).toBe(true);

    const result2 = await service.capture(options);
    expect(result2.success).toBe(true);
  }, 60000);

  test('should clear cache', async () => {
    const options = {
      url: 'https://example.com',
      cacheTTL: 60,
    };

    await service.capture(options);
    service.clearCache();

    // After clearing, should capture again
    const result = await service.capture(options);
    expect(result.success).toBe(true);
  }, 60000);
});

describe('EnhancedScreenshotService - Device Emulation', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should emulate iPhone 12', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      device: 'iPhone 12',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.width).toBe(390);
    expect(result.metadata?.height).toBe(844);
  }, 30000);

  test('should emulate iPad', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      device: 'iPad',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.width).toBe(768);
    expect(result.metadata?.height).toBe(1024);
  }, 30000);

  test('should use custom device preset', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      customDevice: {
        name: 'Custom Device',
        userAgent: 'Mozilla/5.0 Custom',
        viewport: {
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          isLandscape: false,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.width).toBe(375);
    expect(result.metadata?.height).toBe(667);
  }, 30000);
});

describe('EnhancedScreenshotService - Selector & Clip', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should capture specific element by selector', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      selector: 'h1',
    });

    expect(result.success).toBe(true);
    expect(result.screenshot).toBeInstanceOf(Buffer);
    expect(result.metadata?.width).toBeGreaterThan(0);
    expect(result.metadata?.height).toBeGreaterThan(0);
  }, 30000);

  test('should handle selector not found', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      selector: '.non-existent-element',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Element not found');
  }, 30000);

  test('should capture with clip region', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      clip: {
        x: 0,
        y: 0,
        width: 400,
        height: 300,
      },
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.width).toBe(400);
    expect(result.metadata?.height).toBe(300);
  }, 30000);
});

describe('EnhancedScreenshotService - Page Actions', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should wait for selector before screenshot', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        waitForSelector: 'h1',
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should add delay before screenshot', async () => {
    const startTime = Date.now();
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        delay: 1000, // 1 second
      },
    });
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
  }, 35000);

  test('should inject CSS', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        injectCSS: 'body { background-color: red !important; }',
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should inject JavaScript', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        injectJS: `document.body.style.backgroundColor = 'blue';`,
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should hide elements', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        hideElements: ['h1', 'p'],
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should remove elements', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        removeElements: ['h1'],
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should scroll to element', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      actions: {
        scrollToElement: 'h1',
      },
    });

    expect(result.success).toBe(true);
  }, 35000);
});

describe('EnhancedScreenshotService - Page Environment', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should set locale', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      locale: 'zh-CN',
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should set timezone', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      timezone: 'Asia/Shanghai',
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should set geolocation', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      geolocation: {
        latitude: 39.9042,
        longitude: 116.4074,
        accuracy: 100,
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should enable dark mode', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      darkMode: true,
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should disable JavaScript', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      javascript: false,
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should ignore HTTPS errors', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      ignoreHTTPSErrors: true,
    });

    expect(result.success).toBe(true);
  }, 30000);
});

describe('EnhancedScreenshotService - Authentication', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should handle basic authentication', async () => {
    const result = await service.capture({
      url: 'https://httpbin.org/basic-auth/user/passwd',
      auth: {
        basic: {
          username: 'user',
          password: 'passwd',
        },
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should handle bearer token', async () => {
    const result = await service.capture({
      url: 'https://httpbin.org/bearer',
      auth: {
        bearer: 'test-token',
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should handle custom headers', async () => {
    const result = await service.capture({
      url: 'https://httpbin.org/headers',
      auth: {
        headers: {
          'X-Custom-Header': 'test-value',
        },
      },
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should handle cookies', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      auth: {
        cookies: [
          {
            name: 'session',
            value: 'test-session-id',
            domain: 'example.com',
            path: '/',
            httpOnly: true,
            secure: true,
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  }, 30000);
});

describe('EnhancedScreenshotService - WaitUntil Options', () => {
  let service: EnhancedScreenshotService;

  beforeAll(() => {
    service = createEnhancedScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should wait until load', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      waitUntil: 'load',
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should wait until domcontentloaded', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      waitUntil: 'domcontentloaded',
    });

    expect(result.success).toBe(true);
  }, 30000);

  test('should wait until networkidle0', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      waitUntil: 'networkidle0',
    });

    expect(result.success).toBe(true);
  }, 30000);
});
