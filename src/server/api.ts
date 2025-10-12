import { ScreenshotService } from '../core/screenshot';
import { RouteRegistry } from '../core/server-router';
import type {
  ApiRequestBody,
  ApiJsonResponse,
  ApiRouteDefinition,
  ApiServerOptions,
  ServerConfig,
} from '../types';

/**
 * API 服务器
 */
export class ApiServer {
  protected readonly screenshotService: ScreenshotService;
  protected readonly config: ServerConfig;
  private server: ReturnType<typeof Bun.serve> | null = null;
  protected readonly routes: RouteRegistry;

  constructor(config: ApiServerOptions = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      cors: true,
      enableDemo: true,
      ...config,
    };

    this.screenshotService = new ScreenshotService(
      this.config.browser,
      undefined,
      this.config.pool
    );

    const defaultRoutes: ApiRouteDefinition[] = [
      { path: '/health', methods: 'GET', handler: (req) => this.handleHealth(req) },
      {
        path: '/screenshot',
        methods: ['POST', 'OPTIONS'],
        handler: (req) => this.handleScreenshot(req),
      },
    ];

    const userRoutes = config.routes ?? [];
    this.routes = new RouteRegistry([...defaultRoutes, ...userRoutes]);
  }

  /**
   * 处理 CORS 头
   */
  private getCorsHeaders(): Record<string, string> {
    if (!this.config.cors) {
      return {};
    }

    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  /**
   * 处理截图请求
   */
  private async handleScreenshot(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: this.getCorsHeaders(),
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...this.getCorsHeaders(),
        },
      });
    }

    try {
      const body = (await req.json()) as ApiRequestBody;
      const { format = 'json', ...screenshotOptions } = body;

      if (!screenshotOptions.url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        });
      }

      const result = await this.screenshotService.capture(screenshotOptions);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        });
      }

      // 返回图片格式
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
            ...this.getCorsHeaders(),
          },
        });
      }

      // 返回 JSON 格式
      const jsonResponse: ApiJsonResponse = {
        success: true,
        title: result.title,
        description: result.description,
        screenshot: result.screenshot?.toString('base64'),
        metadata: result.metadata,
      };

      return new Response(JSON.stringify(jsonResponse), {
        headers: {
          'Content-Type': 'application/json',
          ...this.getCorsHeaders(),
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        }
      );
    }
  }

  /**
   * 处理健康检查
   */
  private async handleHealth(_req: Request): Promise<Response> {
    const isReady = await this.screenshotService.isReady();

    return new Response(
      JSON.stringify({
        status: isReady ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      }),
      {
        status: isReady ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          ...this.getCorsHeaders(),
        },
      }
    );
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const { port, host } = this.config;

    this.server = Bun.serve({
      port,
      hostname: host,
      fetch: async (req) => {
        const handled = await this.routes.handle(req, {
          config: this.config,
          screenshotService: this.screenshotService,
        });

        if (handled) {
          return handled;
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.log(`Server running at http://${host}:${port}`);
    console.log(`Screenshot API endpoint: http://${host}:${port}/screenshot`);
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    await this.screenshotService.close();
  }
}
