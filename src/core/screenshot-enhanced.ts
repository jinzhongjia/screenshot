import type { Page, PDFOptions } from 'puppeteer';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  BrowserConfig,
  AuthConfig,
  PageActions,
} from '../types';
import { ScreenshotService } from './screenshot';

/**
 * 增强版截图服务
 */
export class EnhancedScreenshotService extends ScreenshotService {
  private cache: Map<string, { result: ScreenshotResult; timestamp: number }> = new Map();

  constructor(config: BrowserConfig = {}) {
    const defaultArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'];
    super({
      ...config,
      args: config.args ?? defaultArgs,
    });
  }

  protected override async getCachedResult(
    options: ScreenshotOptions
  ): Promise<ScreenshotResult | null> {
    if (!options.cacheTTL) {
      return null;
    }

    const cacheKey = this.getCacheKey(options);
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const ttl = options.cacheTTL * 1000;
    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    const cachedScreenshot = cached.result.screenshot
      ? Buffer.from(cached.result.screenshot)
      : undefined;

    return {
      ...cached.result,
      screenshot: cachedScreenshot,
    };
  }

  protected override async storeResultInCache(
    options: ScreenshotOptions,
    result: ScreenshotResult
  ): Promise<void> {
    if (!options.cacheTTL || !result.success || !result.screenshot) {
      return;
    }

    const cacheKey = this.getCacheKey(options);
    this.cache.set(cacheKey, {
      result: {
        ...result,
        screenshot: Buffer.from(result.screenshot),
      },
      timestamp: Date.now(),
    });
  }

  protected override async configurePage(page: Page, options: ScreenshotOptions): Promise<void> {
    await super.configurePage(page, options);

    if (options.ignoreHTTPSErrors) {
      await page.setBypassCSP(true);
    }

    await this.setupPageEnvironment(page, options);
  }

  protected override async beforeNavigate(page: Page, options: ScreenshotOptions): Promise<void> {
    if (options.auth) {
      await this.setupAuth(page, options.auth, options.url);
    }
  }

  protected override async afterNavigate(page: Page, options: ScreenshotOptions): Promise<void> {
    if (options.actions) {
      await this.executePageActions(page, options.actions);
    }
  }

  protected override async captureScreenshot(
    page: Page,
    options: ScreenshotOptions
  ): Promise<Buffer> {
    if (options.type === 'pdf') {
      return this.generatePDF(page, options);
    }

    if (options.selector) {
      const element = await page.$(options.selector);
      if (!element) {
        throw new Error(`Element not found: ${options.selector}`);
      }

      const screenshot = await element.screenshot(this.buildElementScreenshotOptions(options));
      return this.ensureBuffer(screenshot);
    }

    if (options.clip) {
      const screenshot = await page.screenshot(this.buildClipScreenshotOptions(options));
      return this.ensureBuffer(screenshot);
    }

    return super.captureScreenshot(page, options);
  }

  protected override async buildScreenshotMetadata(
    page: Page,
    options: ScreenshotOptions,
    screenshot: Buffer
  ): Promise<NonNullable<ScreenshotResult['metadata']>> {
    if (options.type === 'pdf') {
      return {
        width: options.width ?? 0,
        height: options.height ?? 0,
        size: screenshot.length,
        format: 'pdf',
      };
    }

    if (options.clip) {
      return {
        width: Math.round(options.clip.width),
        height: Math.round(options.clip.height),
        size: screenshot.length,
        format: options.type ?? 'webp',
      };
    }

    if (options.selector) {
      const rect = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          return null;
        }
        const { width, height } = (element as HTMLElement).getBoundingClientRect();
        return { width, height };
      }, options.selector);

      if (rect) {
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          size: screenshot.length,
          format: options.type ?? 'webp',
        };
      }
    }

    return super.buildScreenshotMetadata(page, options, screenshot);
  }

  clearCache(): void {
    this.cache.clear();
  }

  override async close(): Promise<void> {
    await super.close();
    this.clearCache();
  }

  private async setupAuth(page: Page, auth: AuthConfig, url: string): Promise<void> {
    if (auth.headers || auth.basic || auth.bearer) {
      await page.setExtraHTTPHeaders({
        ...auth.headers,
        ...(auth.basic && {
          Authorization: `Basic ${Buffer.from(
            `${auth.basic.username}:${auth.basic.password}`
          ).toString('base64')}`,
        }),
        ...(auth.bearer && {
          Authorization: `Bearer ${auth.bearer}`,
        }),
      });
    }

    if (auth.cookies && auth.cookies.length > 0) {
      // 从 URL 中提取 domain
      const urlObj = new URL(url);
      const defaultDomain = urlObj.hostname;

      const context = page.browserContext();
      // 确保每个 cookie 都有 domain 值
      const cookiesWithDomain = auth.cookies.map((cookie) => ({
        ...cookie,
        domain: cookie.domain || defaultDomain,
      }));
      await context.setCookie(...cookiesWithDomain);
    }
  }

  private async executePageActions(page: Page, actions: PageActions): Promise<void> {
    if (actions.waitForSelector) {
      await page.waitForSelector(actions.waitForSelector, { visible: true });
    }

    if (actions.waitForSelectorHidden) {
      await page.waitForSelector(actions.waitForSelectorHidden, { hidden: true });
    }

    if (actions.delay) {
      await new Promise((resolve) => setTimeout(resolve, actions.delay));
    }

    if (actions.injectCSS) {
      await page.addStyleTag({ content: actions.injectCSS });
    }

    if (actions.injectJS) {
      await page.evaluate(actions.injectJS);
    }

    if (actions.hideElements && actions.hideElements.length > 0) {
      await page.evaluate((selectors) => {
        selectors.forEach((selector: string) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      }, actions.hideElements);
    }

    if (actions.removeElements && actions.removeElements.length > 0) {
      await page.evaluate((selectors) => {
        selectors.forEach((selector: string) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => el.remove());
        });
      }, actions.removeElements);
    }

    if (actions.clickElement) {
      await page.click(actions.clickElement);
    }

    if (actions.scrollToElement) {
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, actions.scrollToElement);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (actions.fillForm && actions.fillForm.length > 0) {
      for (const field of actions.fillForm) {
        await page.type(field.selector, field.value);
      }
    }

    if (actions.waitForNavigation) {
      await page.waitForNavigation();
    }
  }

  private async setupPageEnvironment(page: Page, options: ScreenshotOptions): Promise<void> {
    if (options.locale) {
      await page.evaluateOnNewDocument((locale) => {
        Object.defineProperty(navigator, 'language', {
          get: () => locale,
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => [locale],
        });
      }, options.locale);
    }

    if (options.timezone) {
      await page.evaluateOnNewDocument((tz) => {
        // @ts-expect-error - 时区设置
        Intl.DateTimeFormat.prototype.resolvedOptions = function () {
          return { timeZone: tz };
        };
      }, options.timezone);
    }

    if (options.geolocation) {
      await page.setGeolocation(options.geolocation);
    }

    if (options.offline) {
      await page.setOfflineMode(true);
    }

    if (options.darkMode) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    }

    if (options.javascript === false) {
      await page.setJavaScriptEnabled(false);
    }
  }

  private async generatePDF(page: Page, options: ScreenshotOptions): Promise<Buffer> {
    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    };

    if (options.fullPage) {
      if (options.width) {
        pdfOptions.width = `${options.width}px`;
      }
      if (options.height) {
        pdfOptions.height = `${options.height}px`;
      }
    }

    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  }

  private getCacheKey(options: ScreenshotOptions): string {
    if (options.cacheKey) {
      return options.cacheKey;
    }

    const key = JSON.stringify({
      url: options.url,
      width: options.width,
      height: options.height,
      fullPage: options.fullPage,
      type: options.type,
      device: options.device,
      selector: options.selector,
      darkMode: options.darkMode,
    });

    return Buffer.from(key).toString('base64');
  }

  private buildElementScreenshotOptions(options: ScreenshotOptions): Record<string, unknown> {
    const type = (options.type as any) ?? 'webp';
    const screenshotOptions: Record<string, unknown> = { type };

    if ((type === 'jpeg' || type === 'webp') && typeof options.quality === 'number') {
      screenshotOptions.quality = options.quality ?? 90;
    }

    return screenshotOptions;
  }

  private buildClipScreenshotOptions(options: ScreenshotOptions): Record<string, unknown> {
    const type = (options.type as any) ?? 'webp';
    const screenshotOptions: Record<string, unknown> = {
      type,
      clip: options.clip,
    };

    if ((type === 'jpeg' || type === 'webp') && typeof options.quality === 'number') {
      screenshotOptions.quality = options.quality ?? 90;
    }

    return screenshotOptions;
  }

  private ensureBuffer(data: unknown): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (typeof data === 'string') {
      return Buffer.from(data);
    }

    return Buffer.from(data as Uint8Array);
  }
}

// 导出工厂函数
export function createEnhancedScreenshotService(config?: BrowserConfig): EnhancedScreenshotService {
  return new EnhancedScreenshotService(config);
}
