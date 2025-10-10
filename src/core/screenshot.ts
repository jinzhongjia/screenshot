import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { ScreenshotOptions, ScreenshotResult, BrowserConfig } from '../types';
import { getDevice } from './devices';

/**
 * 截图服务核心类
 */
export class ScreenshotService {
  private browser: Browser | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultTimeout: 30000,
      ...config,
    };
  }

  /**
   * 获取或创建浏览器实例
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: this.config.args,
        executablePath: this.config.executablePath,
      });
    }
    return this.browser;
  }

  /**
   * 提取页面元数据
   */
  private async extractMetadata(page: Page): Promise<{
    title: string;
    description: string;
  }> {
    const title = await page.title();

    const description = await page.evaluate(() => {
      const metaDescription = document.querySelector('meta[name="description"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      return (
        metaDescription?.getAttribute('content') || ogDescription?.getAttribute('content') || ''
      );
    });

    return { title, description };
  }

  /**
   * 截取网页截图
   */
  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    const {
      url,
      width = 1920,
      height = 1080,
      fullPage = false,
      quality = 90,
      type = 'webp',
      waitUntil = 'networkidle2',
      timeout = this.config.defaultTimeout || 30000,
      device,
      customDevice,
    } = options;

    let page: Page | null = null;

    try {
      // 验证 URL
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      const browser = await this.getBrowser();
      page = await browser.newPage();

      // 设置设备模拟或视口大小
      if (device || customDevice) {
        const devicePreset = customDevice || (device ? getDevice(device) : undefined);
        if (devicePreset) {
          // 设置用户代理
          await page.setUserAgent(devicePreset.userAgent);
          // 设置视口
          await page.setViewport(devicePreset.viewport);
        } else if (device) {
          // 如果找不到预设，使用默认视口
          await page.setViewport({ width, height });
        }
      } else {
        // 设置默认视口大小
        await page.setViewport({ width, height });
      }

      // 设置超时
      page.setDefaultTimeout(timeout);

      // 访问网页
      await page.goto(url, {
        waitUntil,
        timeout,
      });

      // 获取页面元数据
      const { title, description } = await this.extractMetadata(page);

      // 截图配置
      const screenshotOptions: any = {
        type,
        fullPage,
      };

      // 根据格式设置质量
      if (type === 'jpeg' || type === 'webp') {
        screenshotOptions.quality = quality;
      }

      // 执行截图
      const screenshotResult = await page.screenshot(screenshotOptions);
      const screenshot = Buffer.isBuffer(screenshotResult)
        ? screenshotResult
        : Buffer.from(screenshotResult as unknown as Uint8Array);

      // 计算元数据
      const metadata = {
        width: fullPage ? 0 : width, // 全页面截图时宽度需要后续计算
        height: fullPage ? 0 : height,
        size: screenshot.length,
        format: type,
      };

      // 如果是全页面截图，获取实际尺寸
      if (fullPage) {
        const dimensions = await page.evaluate(() => {
          return {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          };
        });
        metadata.width = dimensions.width;
        metadata.height = dimensions.height;
      } else if (device || customDevice) {
        // 如果使用了设备模拟，获取设备视口尺寸
        const devicePreset = customDevice || (device ? getDevice(device) : undefined);
        if (devicePreset) {
          metadata.width = devicePreset.viewport.width;
          metadata.height = devicePreset.viewport.height;
        }
      }

      return {
        success: true,
        title,
        description,
        screenshot,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // 关闭页面
      if (page) {
        await page.close().catch(console.error);
      }
    }
  }

  /**
   * 关闭浏览器实例
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 检查服务是否就绪
   */
  async isReady(): Promise<boolean> {
    try {
      await this.getBrowser();
      return true;
    } catch {
      return false;
    }
  }
}

// 导出默认实例工厂函数
export function createScreenshotService(config?: BrowserConfig): ScreenshotService {
  return new ScreenshotService(config);
}
