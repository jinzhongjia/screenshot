import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { createScreenshotService, ScreenshotService } from '../src';
import type { ScreenshotResult } from '../src';

describe('ScreenshotService', () => {
  let service: ScreenshotService;

  beforeAll(() => {
    service = createScreenshotService({
      headless: true,
      defaultTimeout: 30000,
    });
  });

  afterAll(async () => {
    await service.close();
  });

  test('should capture screenshot successfully', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      width: 1920,
      height: 1080,
    });

    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.screenshot).toBeInstanceOf(Buffer);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.width).toBe(1920);
    expect(result.metadata?.height).toBe(1080);
    expect(result.metadata?.format).toBe('webp');
  }, 30000);

  test('should capture full page screenshot', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      fullPage: true,
    });

    expect(result.success).toBe(true);
    expect(result.screenshot).toBeInstanceOf(Buffer);
    expect(result.metadata?.width).toBeGreaterThan(0);
    expect(result.metadata?.height).toBeGreaterThan(0);
  }, 30000);

  test('should capture screenshot in different formats', async () => {
    // Test PNG
    const pngResult = await service.capture({
      url: 'https://example.com',
      width: 800,
      height: 600,
      type: 'png',
    });

    expect(pngResult.success).toBe(true);
    expect(pngResult.metadata?.format).toBe('png');

    // Test JPEG
    const jpegResult = await service.capture({
      url: 'https://example.com',
      width: 800,
      height: 600,
      type: 'jpeg',
      quality: 80,
    });

    expect(jpegResult.success).toBe(true);
    expect(jpegResult.metadata?.format).toBe('jpeg');
  }, 30000);

  test('should extract page metadata', async () => {
    const result = await service.capture({
      url: 'https://example.com',
      width: 1920,
      height: 1080,
    });

    expect(result.success).toBe(true);
    expect(result.title).toBe('Example Domain');
    expect(result.description).toBeDefined();
  }, 30000);

  test('should handle invalid URL', async () => {
    const result = await service.capture({
      url: 'not-a-valid-url',
      width: 1920,
      height: 1080,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid URL');
  });

  test('should handle timeout', async () => {
    const result = await service.capture({
      url: 'https://httpstat.us/200?sleep=10000',
      timeout: 2000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }, 5000);

  test('should check service readiness', async () => {
    const isReady = await service.isReady();
    expect(isReady).toBe(true);
  });
});

describe('Multiple Screenshots', () => {
  let service: ScreenshotService;

  beforeAll(() => {
    service = new ScreenshotService();
  });

  afterAll(async () => {
    await service.close();
  });

  test('should capture multiple screenshots with same service instance', async () => {
    const urls = ['https://example.com', 'https://example.org', 'https://example.net'];

    const results: ScreenshotResult[] = [];

    for (const url of urls) {
      const result = await service.capture({
        url,
        width: 1280,
        height: 720,
      });
      results.push(result);
    }

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.every((r) => r.screenshot instanceof Buffer)).toBe(true);
  }, 60000);
});

describe('Error Handling', () => {
  test('should handle network errors gracefully', async () => {
    const service = createScreenshotService();

    const result = await service.capture({
      url: 'https://this-domain-definitely-does-not-exist-123456789.com',
      timeout: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    await service.close();
  }, 10000);

  test('should handle malformed URLs', async () => {
    const service = createScreenshotService();

    const testUrls = [
      'javascript:alert(1)',
      'file:///etc/passwd',
      'data:text/html,<h1>test</h1>',
      '../../etc/passwd',
    ];

    for (const url of testUrls) {
      const result = await service.capture({ url });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }

    await service.close();
  });
});
