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
  protected async getCachedResult(options: ScreenshotOptions): Promise<ScreenshotResult | null> {
    return null;
  }

  /**
   * 钩子：创建浏览器页面
   */
  protected async createPage(browser: Browser, _options: ScreenshotOptions): Promise<Page> {
    return browser.newPage();
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
   * 设置页面环境（可被子类扩展）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async configurePage(page: Page, options: ScreenshotOptions): Promise<void> {
    const {
      width = 1920,
      height = 1080,
      device,
      customDevice,
    } = options;

    if (device || customDevice) {
      const devicePreset = customDevice || (device ? getDevice(device) : undefined);
      if (devicePreset) {
        await page.setUserAgent(devicePreset.userAgent);
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
    const {
      type = 'webp',
      quality = 90,
      fullPage = false,
    } = options;

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
    await page.close().catch(console.error);
  }
}

// 导出默认实例工厂函数
export function createScreenshotService(config?: BrowserConfig): ScreenshotService {
  return new ScreenshotService(config);
}
