/**
 * API 客户端使用示例
 */

import type { ApiJsonResponse } from '../src';

// API 配置
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Screenshot API 客户端类
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
   * 截取网页截图（返回 JSON）
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
   * 截取网页截图（返回图片二进制）
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
   * 健康检查
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

// 使用示例

async function jsonExample() {
  console.log('📸 JSON 格式响应示例');

  const client = new ScreenshotApiClient();

  try {
    const result = await client.captureAsJson('https://example.com', {
      width: 1920,
      height: 1080,
    });

    if (result.success) {
      console.log('✅ 截图成功');
      console.log('   标题:', result.title);
      console.log('   描述:', result.description);

      if (result.metadata) {
        console.log('   尺寸:', `${result.metadata.width}x${result.metadata.height}`);
        console.log('   大小:', Math.round(result.metadata.size / 1024), 'KB');
      }

      // 保存截图
      const buffer = Buffer.from(result.screenshot!, 'base64');
      await Bun.write('api-json-example.webp', buffer);
      console.log('   已保存: api-json-example.webp');
    }
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

async function imageExample() {
  console.log('\n📸 图片格式响应示例');

  const client = new ScreenshotApiClient();

  try {
    const imageBuffer = await client.captureAsImage('https://github.com', {
      width: 1280,
      height: 720,
      fullPage: false,
    });

    console.log('✅ 获取图片成功');
    console.log('   大小:', Math.round(imageBuffer.length / 1024), 'KB');

    await Bun.write('api-image-example.webp', imageBuffer);
    console.log('   已保存: api-image-example.webp');
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

async function batchApiCapture() {
  console.log('\n📸 批量 API 调用示例');

  const client = new ScreenshotApiClient();
  const urls = ['https://example.com', 'https://bun.sh', 'https://www.typescriptlang.org'];

  // 并行请求
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

  console.log('\n📊 批量结果:');
  results.forEach((result) => {
    if (result.success) {
      console.log(`   ✅ ${result.url}`);
      console.log(`      标题: ${result.title}`);
      console.log(`      文件: ${result.filename}`);
    } else {
      console.log(`   ❌ ${result.url}: ${result.error}`);
    }
  });
}

async function healthCheckExample() {
  console.log('\n🏥 健康检查示例');

  const client = new ScreenshotApiClient();
  const isHealthy = await client.healthCheck();

  if (isHealthy) {
    console.log('✅ 服务健康');
  } else {
    console.log('❌ 服务不可用');
  }
}

// 创建一个高级客户端，带重试机制
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
        console.log(`   重试 ${retries + 1}/${this.maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.captureWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }
}

async function advancedClientExample() {
  console.log('\n🚀 高级客户端示例（带重试）');

  const client = new AdvancedScreenshotClient(API_BASE_URL, 3, 2000);

  try {
    const result = await client.captureWithRetry('https://example.com', {
      width: 1920,
      height: 1080,
    });

    if (result.success) {
      console.log('✅ 截图成功（可能经过重试）');
      console.log('   标题:', result.title);
    }
  } catch (error) {
    console.error('❌ 最终失败（已重试）:', error);
  }
}

// 主函数
async function main() {
  console.log('🚀 Screenshot API 客户端示例\n');
  console.log('='.repeat(50));

  // 首先检查服务是否可用
  const client = new ScreenshotApiClient();
  const isHealthy = await client.healthCheck();

  if (!isHealthy) {
    console.log('⚠️  API 服务不可用，请先启动服务：');
    console.log('   bun run dev');
    process.exit(1);
  }

  console.log('✅ API 服务已就绪\n');

  try {
    await jsonExample();
    await imageExample();
    await batchApiCapture();
    await healthCheckExample();
    await advancedClientExample();

    console.log('\n✨ 所有示例运行完成！');
  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
  }
}

// 运行示例
if (import.meta.main) {
  main();
}
