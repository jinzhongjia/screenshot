import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { ApiServer } from '../src';

describe('ApiServer', () => {
  let server: ApiServer;
  const testPort = 3001;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    server = new ApiServer({
      port: testPort,
      host: 'localhost',
      cors: true,
    });
    await server.start();
    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Screenshot Endpoint - JSON Format', () => {
    test('should capture screenshot and return JSON', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          width: 800,
          height: 600,
          format: 'json',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.title).toBeDefined();
      expect(data.screenshot).toBeDefined();
      expect(typeof data.screenshot).toBe('string'); // Base64 encoded
      expect(data.metadata).toBeDefined();
      expect(data.metadata.width).toBe(800);
      expect(data.metadata.height).toBe(600);
    }, 30000);

    test('should handle missing URL', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          width: 800,
          height: 600,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('URL is required');
    });

    test('should handle invalid URL', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'not-a-valid-url',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    }, 30000);
  });

  describe('Screenshot Endpoint - Image Format', () => {
    test('should return screenshot as webp image', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          width: 800,
          height: 600,
          format: 'image',
          type: 'webp',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    }, 30000);

    test('should return screenshot as png image', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          width: 800,
          height: 600,
          format: 'image',
          type: 'png',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    }, 30000);

    test('should return screenshot as jpeg image', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          width: 800,
          height: 600,
          format: 'image',
          type: 'jpeg',
          quality: 80,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/jpeg');

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    }, 30000);
  });

  describe('CORS', () => {
    test('should handle OPTIONS request', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toBeDefined();
    });

    test('should include CORS headers in response', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
        }),
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    }, 30000);
  });

  describe('HTTP Methods', () => {
    test('should reject GET requests', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
    });

    test('should reject PUT requests', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle network timeout', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://httpstat.us/200?sleep=10000',
          timeout: 2000,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    }, 10000);
  });

  describe('404 Routes', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await fetch(`${baseUrl}/unknown-route`);
      expect(response.status).toBe(404);
    });
  });

  describe('Custom Routes', () => {
    const customPort = 3005;
    const customBaseUrl = `http://localhost:${customPort}`;
    let customServer: ApiServer;

    beforeAll(async () => {
      customServer = new ApiServer({
        port: customPort,
        routes: [
          {
            path: '/custom',
            methods: 'GET',
            handler: async (_req, { config }) => {
              return new Response(
                JSON.stringify({
                  message: 'custom route',
                  port: config.port,
                }),
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
            },
          },
        ],
      });

      await customServer.start();
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    afterAll(async () => {
      await customServer.stop();
    });

    test('should handle user-defined routes', async () => {
      const response = await fetch(`${customBaseUrl}/custom`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = (await response.json()) as { message: string; port?: number };
      expect(data.message).toBe('custom route');
      expect(data.port).toBe(customPort);
    });
  });

  describe('Advanced Screenshot Options', () => {
    test('should capture full page screenshot', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          fullPage: true,
          format: 'json',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.height).toBeGreaterThan(0);
    }, 30000);

    test('should capture with device emulation', async () => {
      const response = await fetch(`${baseUrl}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          device: 'iPhone 12',
          format: 'json',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.width).toBe(390);
    }, 30000);
  });
});

describe('ApiServer - No CORS', () => {
  let server: ApiServer;
  const testPort = 3002;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    server = new ApiServer({
      port: testPort,
      host: 'localhost',
      cors: false,
    });
    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await server.stop();
  });

  test('should not include CORS headers when disabled', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
