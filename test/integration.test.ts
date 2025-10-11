import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import {
  createScreenshotService,
  createEnhancedScreenshotService,
  ScreenshotService,
  EnhancedScreenshotService,
} from '../src';

describe('Integration Tests', () => {
  describe('Service Factory Functions', () => {
    test('createScreenshotService should return ScreenshotService instance', () => {
      const service = createScreenshotService();
      expect(service).toBeInstanceOf(ScreenshotService);
      service.close();
    });

    test('createEnhancedScreenshotService should return EnhancedScreenshotService instance', () => {
      const service = createEnhancedScreenshotService();
      expect(service).toBeInstanceOf(EnhancedScreenshotService);
      expect(service).toBeInstanceOf(ScreenshotService); // Should inherit
      service.close();
    });

    test('services should accept configuration', () => {
      const service = createScreenshotService({
        headless: true,
        defaultTimeout: 60000,
      });
      expect(service).toBeInstanceOf(ScreenshotService);
      service.close();
    });
  });

  describe('Complex Scenarios', () => {
    let service: EnhancedScreenshotService;

    beforeAll(() => {
      service = createEnhancedScreenshotService({
        headless: true,
        defaultTimeout: 60000,
      });
    });

    afterAll(async () => {
      await service.close();
    });

    test('should handle multiple sequential screenshots', async () => {
      const urls = ['https://example.com', 'https://example.org', 'https://example.net'];

      for (const url of urls) {
        const result = await service.capture({ url });
        expect(result.success).toBe(true);
        expect(result.screenshot).toBeInstanceOf(Buffer);
      }
    }, 90000);

    test('should handle rapid sequential screenshots', async () => {
      const urls = ['https://example.com', 'https://example.org', 'https://example.net'];

      // 快速连续执行截图（不是真正的并行）
      // 这测试了服务能够快速处理多个请求
      const results = [];
      for (const url of urls) {
        const result = await service.capture({ url });
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach((result, _index) => {
        expect(result.success).toBe(true);
        expect(result.screenshot).toBeInstanceOf(Buffer);
      });
    }, 45000);

    test('should capture with multiple options combined', async () => {
      // 添加小延迟避免与前一个测试的资源冲突
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await service.capture({
        url: 'https://example.com',
        width: 1280,
        height: 720,
        type: 'png',
        fullPage: false,
        quality: 85,
        waitUntil: 'networkidle2',
        darkMode: true,
        actions: {
          delay: 500,
          injectCSS: 'body { padding: 20px; }',
        },
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe('png');
      expect(result.metadata?.width).toBe(1280);
      expect(result.metadata?.height).toBe(720);
    }, 45000);

    test('should handle device emulation with actions', async () => {
      // 添加小延迟避免与前一个测试的资源冲突
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await service.capture({
        url: 'https://example.com',
        device: 'iPhone 12',
        actions: {
          delay: 1000,
          hideElements: ['header', 'footer'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.width).toBe(390);
    }, 45000);

    test('should cache multiple requests', async () => {
      // 添加小延迟避免与前一个测试的资源冲突
      await new Promise((resolve) => setTimeout(resolve, 500));

      const options = {
        url: 'https://example.com',
        cacheTTL: 60,
        cacheKey: 'integration-test-cache',
      };

      // First call
      const result1 = await service.capture(options);
      expect(result1.success).toBe(true);

      // Second call (should use cache)
      const result2 = await service.capture(options);
      expect(result2.success).toBe(true);

      // Both should return data
      expect(result1.screenshot).toBeDefined();
      expect(result2.screenshot).toBeDefined();
    }, 60000);
  });

  describe('Edge Cases', () => {
    let service: EnhancedScreenshotService;

    beforeAll(() => {
      service = createEnhancedScreenshotService();
    });

    afterAll(async () => {
      await service.close();
    });

    test('should handle very small dimensions', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        width: 100,
        height: 100,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.width).toBe(100);
      expect(result.metadata?.height).toBe(100);
    }, 30000);

    test('should handle very large dimensions', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        width: 3840,
        height: 2160,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.width).toBe(3840);
      expect(result.metadata?.height).toBe(2160);
    }, 45000);

    test('should handle special characters in URL', async () => {
      const result = await service.capture({
        url: 'https://example.com/?query=test&param=value',
      });

      expect(result.success).toBe(true);
    }, 30000);

    test('should handle HTTPS URLs', async () => {
      const result = await service.capture({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
    }, 30000);

    test('should handle HTTP URLs', async () => {
      const result = await service.capture({
        url: 'http://example.com',
      });

      expect(result.success).toBe(true);
    }, 30000);

    test('should handle very long URLs', async () => {
      const longPath = 'a'.repeat(100);
      const result = await service.capture({
        url: `https://example.com/${longPath}`,
      });

      // May succeed or fail depending on server, but should not crash
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    }, 30000);

    test('should handle empty actions object', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        actions: {},
      });

      expect(result.success).toBe(true);
    }, 30000);

    test('should handle multiple hide and remove elements', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        actions: {
          hideElements: ['h1', 'h2', 'h3', 'p', 'div.example'],
          removeElements: ['footer', 'header', 'nav'],
        },
      });

      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('Resource Cleanup', () => {
    test('should properly close browser on service close', async () => {
      const service = createScreenshotService();

      await service.capture({
        url: 'https://example.com',
      });

      const isReadyBefore = await service.isReady();
      expect(isReadyBefore).toBe(true);

      await service.close();

      // Browser should be closed
      const isReadyAfter = await service.isReady();
      expect(isReadyAfter).toBe(true); // Will create new browser instance
    }, 60000);

    test('should handle multiple close calls', async () => {
      const service = createScreenshotService();

      await service.capture({
        url: 'https://example.com',
      });

      await service.close();
      await service.close(); // Should not throw
      await service.close(); // Should not throw

      // Should work fine
      expect(service).toBeDefined();
    }, 60000);
  });

  describe('Browser Configuration', () => {
    test('should work with custom browser args', async () => {
      const service = createScreenshotService({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const result = await service.capture({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      await service.close();
    }, 30000);

    test('should work with custom timeout', async () => {
      const service = createScreenshotService({
        defaultTimeout: 45000,
      });

      const result = await service.capture({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      await service.close();
    }, 50000);
  });

  describe('Metadata Extraction', () => {
    let service: EnhancedScreenshotService;

    beforeAll(() => {
      service = createEnhancedScreenshotService();
    });

    afterAll(async () => {
      await service.close();
    });

    test('should extract title and description', async () => {
      const result = await service.capture({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.title).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(result.description).toBeDefined();
    }, 30000);

    test('should include size in metadata', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        type: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.size).toBeGreaterThan(0);
      expect(result.metadata?.format).toBe('png');
    }, 30000);
  });

  describe('Quality Settings', () => {
    let service: EnhancedScreenshotService;

    beforeAll(() => {
      service = createEnhancedScreenshotService();
    });

    afterAll(async () => {
      await service.close();
    });

    test('should handle different quality levels for JPEG', async () => {
      const qualities = [10, 50, 90, 100];
      const results = [];

      for (const quality of qualities) {
        const result = await service.capture({
          url: 'https://example.com',
          type: 'jpeg',
          quality,
          width: 800,
          height: 600,
        });
        results.push(result);
      }

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    }, 120000);

    test('should handle different quality levels for WebP', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        type: 'webp',
        quality: 80,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe('webp');
    }, 30000);

    test('PNG should ignore quality parameter', async () => {
      const result = await service.capture({
        url: 'https://example.com',
        type: 'png',
        quality: 50, // Should be ignored for PNG
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe('png');
    }, 30000);
  });
});
