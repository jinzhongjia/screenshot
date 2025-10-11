import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { ScreenshotOptions, ScreenshotResult, BrowserConfig } from '../types';
import { getDevice } from './devices';

/**
 * 截图服务核心类
 */
export class ScreenshotService {
  protected browser: Browser | null = null;
  protected config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultTimeout: 30000,
      ...config,
    };
  }

  /**
   * 截取网页截图
   */
  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    // 最多重试一次，以处理浏览器连接问题
    let retries = 1;
    let lastError: unknown;
    
    while (retries >= 0) {
      try {
        return await this.captureInternal(options);
      } catch (error) {
        lastError = error;
        // 如果是连接错误且还有重试次数，重置浏览器并重试
        if (retries > 0 && error instanceof Error && 
            (error.message.includes('Connection closed') || 
             error.message.includes('Session closed'))) {
          console.warn('Browser connection lost, attempting to reconnect...');
          this.browser = null;
          retries--;
        } else {
          break;
        }
      }
    }
    
    return this.createErrorResult(lastError);
  }

  /**
   * 内部截图实现
   */
  private async captureInternal(options: ScreenshotOptions): Promise<ScreenshotResult> {
    // 当前，该钩子没用，但保留以备将来扩展
    const cachedResult = await this.getCachedResult(options);
    if (cachedResult) {
      return cachedResult;
    }

    let page: Page | null = null;

    try {
      this.validateOptions(options);

      const browser = await this.getBrowser();
      page = await this.createPage(browser, options);

      const timeout = this.getTimeout(options);
      await this.configurePage(page, options);
      page.setDefaultTimeout(timeout);

      await this.beforeNavigate(page, options);

      await page.goto(options.url, {
        waitUntil: this.getWaitUntil(options),
        timeout,
      });

      await this.afterNavigate(page, options);

      const pageMeta = await this.extractMetadata(page);
      const screenshot = await this.captureScreenshot(page, options);
      const metadata = await this.buildScreenshotMetadata(page, options, screenshot);

      const result = this.createSuccessResult(pageMeta, screenshot, metadata);
      await this.storeResultInCache(options, result);
      return result;
    } catch (error) {
      return this.createErrorResult(error);
    } finally {
      if (page) {
        await this.cleanupPage(page);
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

  /**
   * 钩子：检查缓存
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getCachedResult(_: ScreenshotOptions): Promise<ScreenshotResult | null> {
    return null;
  }

  /**
   * 钩子：创建浏览器页面
   */
  protected async createPage(browser: Browser, _options: ScreenshotOptions): Promise<Page> {
     try {
       // 检查浏览器是否仍然连接
       if (!browser.connected) {
         throw new Error('Browser is not connected');
       }
       return await browser.newPage();
     } catch (error) {
       // 如果创建页面失败，尝试重置浏览器
       console.error('Failed to create page, resetting browser:', error);
       this.browser = null;
       throw error;
     }
  }

  /**
   * 验证输入参数
   */
  protected validateOptions(options: ScreenshotOptions): void {
    if (!options.url) {
      throw new Error('URL is required');
    }

    try {
      const parsedUrl = new URL(options.url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Unsupported URL protocol');
      }
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * 获取或创建浏览器实例
   */
  protected async getBrowser(): Promise<Browser> {
     if (!this.browser || !this.browser.connected) {
       // 如果浏览器未连接，清理旧实例
       if (this.browser && !this.browser.connected) {
         this.browser = null;
       }
       
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: this.config.args,
        executablePath: this.config.executablePath,
      });
    }
    return this.browser;
  }

  /**
   * 设置页面环境（可被子类扩展）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async configurePage(page: Page, options: ScreenshotOptions): Promise<void> {
    const { width = 1920, height = 1080, device, customDevice } = options;

    if (device || customDevice) {
      const devicePreset = customDevice || (device ? getDevice(device) : undefined);
      if (devicePreset) {
        await page.setUserAgent({ userAgent: devicePreset.userAgent });
        await page.setViewport(devicePreset.viewport);
      } else if (device) {
        await page.setViewport({ width, height });
      }
    } else {
      await page.setViewport({ width, height });
    }
  }

  /**
   * 导航前钩子
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async beforeNavigate(_page: Page, _options: ScreenshotOptions): Promise<void> {}

  /**
   * 导航后钩子
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterNavigate(_page: Page, _options: ScreenshotOptions): Promise<void> {}

  /**
   * 执行截图
   */
  protected async captureScreenshot(page: Page, options: ScreenshotOptions): Promise<Buffer> {
    const { type = 'webp', quality = 90, fullPage = false } = options;

    const screenshotOptions: any = {
      type,
      fullPage,
    };

    if ((type === 'jpeg' || type === 'webp') && typeof quality === 'number') {
      screenshotOptions.quality = quality;
    }

    const screenshotResult = await page.screenshot(screenshotOptions);
    return Buffer.isBuffer(screenshotResult)
      ? screenshotResult
      : Buffer.from(screenshotResult as unknown as Uint8Array);
  }

  /**
   * 构建截图元数据
   */
  protected async buildScreenshotMetadata(
    page: Page,
    options: ScreenshotOptions,
    screenshot: Buffer
  ): Promise<NonNullable<ScreenshotResult['metadata']>> {
    const {
      width = 1920,
      height = 1080,
      fullPage = false,
      type = 'webp',
      device,
      customDevice,
    } = options;

    const metadata = {
      width: fullPage ? 0 : width,
      height: fullPage ? 0 : height,
      size: screenshot.length,
      format: type,
    };

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
      const devicePreset = customDevice || (device ? getDevice(device) : undefined);
      if (devicePreset) {
        metadata.width = devicePreset.viewport.width;
        metadata.height = devicePreset.viewport.height;
      }
    }

    return metadata;
  }

  /**
   * 缓存结果钩子
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async storeResultInCache(
    _options: ScreenshotOptions,
    _result: ScreenshotResult
  ): Promise<void> {}

  /**
   * 生成成功结果
   */
  protected createSuccessResult(
    pageMeta: { title: string; description: string },
    screenshot: Buffer,
    metadata: NonNullable<ScreenshotResult['metadata']>
  ): ScreenshotResult {
    return {
      success: true,
      title: pageMeta.title,
      description: pageMeta.description,
      screenshot,
      metadata,
    };
  }

  /**
   * 生成失败结果
   */
  protected createErrorResult(error: unknown): ScreenshotResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * 获取导航等待条件
   */
  protected getWaitUntil(options: ScreenshotOptions): NonNullable<ScreenshotOptions['waitUntil']> {
    return options.waitUntil ?? 'networkidle2';
  }

  /**
   * 获取超时时间
   */
  protected getTimeout(options: ScreenshotOptions): number {
    return options.timeout ?? this.config.defaultTimeout ?? 30000;
  }

  /**
   * 提取页面元数据
   */
  protected async extractMetadata(page: Page): Promise<{ title: string; description: string }> {
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
   * 页面清理
   */
  protected async cleanupPage(page: Page): Promise<void> {
     try {
       if (page && !page.isClosed()) {
         await page.close();
       }
     } catch (error) {
       // 忽略连接已关闭的错误
       if (error instanceof Error && !error.message.includes('Connection closed')) {
         console.error('Error closing page:', error);
       }
     }
  }
}

// 导出默认实例工厂函数
export function createScreenshotService(config?: BrowserConfig): ScreenshotService {
  return new ScreenshotService(config);
}
