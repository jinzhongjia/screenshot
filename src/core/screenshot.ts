import type { Browser, Page } from 'puppeteer';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  BrowserConfig,
  BrowserPoolAcquireResult,
  BrowserPoolAcquireOptions,
  BrowserPoolConfig,
} from '../types';
import { getDevice } from './devices';
import { BrowserPoolManager } from './browser-pool';

/**
 * Screenshot service core class
 */
export class ScreenshotService {
  protected config: BrowserConfig;
  protected readonly poolManager: BrowserPoolManager;
  private currentAcquire: BrowserPoolAcquireResult | null = null;

  constructor(
    config: BrowserConfig = {},
    poolManager?: BrowserPoolManager,
    poolConfig?: BrowserPoolConfig
  ) {
    this.config = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultTimeout: 30000,
      ...config,
    };

    this.poolManager = poolManager ?? BrowserPoolManager.getDefaultInstance(poolConfig);
  }

  /**
   * Capture webpage screenshot
   */
  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    // Retry once at most to handle browser connection issues
    let retries = 1;
    let lastError: unknown;

    while (retries >= 0) {
      try {
        return await this.captureInternal(options);
      } catch (error) {
        lastError = error;
        // If connection error and retries remaining, reset browser and retry
        if (
          retries > 0 &&
          error instanceof Error &&
          (error.message.includes('Connection closed') || error.message.includes('Session closed'))
        ) {
          console.warn('Browser connection lost, attempting to reconnect...');
          await this.invalidateCurrentBrowser(error);
          retries--;
        } else {
          break;
        }
      }
    }

    return this.createErrorResult(lastError);
  }

  /**
   * Internal screenshot implementation
   */
  private async captureInternal(options: ScreenshotOptions): Promise<ScreenshotResult> {
    // Currently this hook is unused, but kept for future extensions
    const cachedResult = await this.getCachedResult(options);
    if (cachedResult) {
      return cachedResult;
    }

    let page: Page | null = null;

    try {
      this.validateOptions(options);

      const browser = await this.getBrowser(options);
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
      await this.releaseBrowser();
    }
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    await this.poolManager.drain();
  }

  /**
   * Check if service is ready
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
   * Hook: Check cache
   */
  protected async getCachedResult(_options: ScreenshotOptions): Promise<ScreenshotResult | null> {
    return null;
  }

  /**
   * Hook: Create browser page
   */
  protected async createPage(browser: Browser, _options: ScreenshotOptions): Promise<Page> {
    try {
      // Check if browser is still connected
      if (!browser.connected) {
        throw new Error('Browser is not connected');
      }
      return await browser.newPage();
    } catch (error) {
      // If page creation fails, try to reset browser
      console.error('Failed to create page, resetting browser:', error);
      await this.invalidateCurrentBrowser(error);
      throw error;
    }
  }

  /**
   * Validate input parameters
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
   * Get or create browser instance
   */
  protected async getBrowser(options?: ScreenshotOptions): Promise<Browser> {
    if (this.currentAcquire) {
      return this.currentAcquire.browser;
    }

    const acquireOptions: BrowserPoolAcquireOptions = {
      config: this.buildBrowserConfig(options),
    };

    if (
      this.config.acquireTimeout &&
      (acquireOptions.timeout === undefined || acquireOptions.timeout === null)
    ) {
      acquireOptions.timeout = this.config.acquireTimeout;
    }

    this.currentAcquire = await this.poolManager.acquire(acquireOptions);

    return this.currentAcquire.browser;
  }

  private async releaseBrowser(): Promise<void> {
    if (!this.currentAcquire) {
      return;
    }

    await this.poolManager.release(this.currentAcquire.poolKey, this.currentAcquire.browser);
    this.currentAcquire = null;
  }

  private async invalidateCurrentBrowser(reason?: unknown): Promise<void> {
    if (!this.currentAcquire) {
      return;
    }

    await this.poolManager.invalidate(
      this.currentAcquire.poolKey,
      this.currentAcquire.browser,
      reason
    );
    this.currentAcquire = null;
  }

  private buildBrowserConfig(options?: ScreenshotOptions): BrowserConfig {
    if (!options?.browser) {
      return this.config;
    }

    const mergedArgs = Array.from(
      new Set([...(this.config.args ?? []), ...(options.browser.args ?? [])])
    );

    return {
      ...this.config,
      ...options.browser,
      args: mergedArgs,
    };
  }

  /**
   * Configure page environment (can be extended by subclasses)
   */
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
   * Pre-navigation hook
   */
  protected async beforeNavigate(_page: Page, _options: ScreenshotOptions): Promise<void> {
    return;
  }

  /**
   * Post-navigation hook
   */
  protected async afterNavigate(_page: Page, _options: ScreenshotOptions): Promise<void> {
    return;
  }

  /**
   * Execute screenshot
   */
  protected async captureScreenshot(page: Page, options: ScreenshotOptions): Promise<Buffer> {
    const { type = 'webp', quality = 90, fullPage = false } = options;

    const screenshotOptions: any = {
      type,
      fullPage,
    };

    // PNG does not support quality parameter, only JPEG and WebP do
    if ((type === 'jpeg' || type === 'webp') && typeof quality === 'number') {
      screenshotOptions.quality = quality;
    }

    const screenshotResult = await page.screenshot(screenshotOptions);
    const screenshotBuffer: Buffer = Buffer.isBuffer(screenshotResult)
      ? screenshotResult
      : Buffer.from(screenshotResult as unknown as Uint8Array);

    return screenshotBuffer;
  }

  /**
   * Build screenshot metadata
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
   * Cache result hook
   */
  protected async storeResultInCache(
    _options: ScreenshotOptions,
    _result: ScreenshotResult
  ): Promise<void> {
    return;
  }

  /**
   * Create success result
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
   * Create error result
   */
  protected createErrorResult(error: unknown): ScreenshotResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Get navigation wait condition
   */
  protected getWaitUntil(options: ScreenshotOptions): NonNullable<ScreenshotOptions['waitUntil']> {
    return options.waitUntil ?? 'networkidle2';
  }

  /**
   * Get timeout
   */
  protected getTimeout(options: ScreenshotOptions): number {
    return options.timeout ?? this.config.defaultTimeout ?? 30000;
  }

  /**
   * Extract page metadata
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
   * Page cleanup
   */
  protected async cleanupPage(page: Page): Promise<void> {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      // Ignore connection closed errors
      if (error instanceof Error && !error.message.includes('Connection closed')) {
        console.error('Error closing page:', error);
      }
    }
  }
}

// Export default instance factory function
export function createScreenshotService(config?: BrowserConfig): ScreenshotService {
  return new ScreenshotService(config);
}
