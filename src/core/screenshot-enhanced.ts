import puppeteer, { type Browser, type Page, type PDFOptions } from 'puppeteer';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  BrowserConfig,
  AuthConfig,
  PageActions,
} from '../types';
import { getDevice } from './devices';

/**
 * 增强版截图服务
 */
export class EnhancedScreenshotService {
  private browser: Browser | null = null;
  private config: BrowserConfig;
  private cache: Map<string, { data: Buffer; timestamp: number }> = new Map();

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
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
   * 设置认证
   */
  private async setupAuth(page: Page, auth: AuthConfig): Promise<void> {
    // 设置请求拦截
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

    // 设置 Cookies
    if (auth.cookies && auth.cookies.length > 0) {
      await page.setCookie(...auth.cookies);
    }
  }

  /**
   * 执行页面操作
   */
  private async executePageActions(page: Page, actions: PageActions): Promise<void> {
    // 等待元素
    if (actions.waitForSelector) {
      await page.waitForSelector(actions.waitForSelector, { visible: true });
    }

    // 等待元素消失
    if (actions.waitForSelectorHidden) {
      await page.waitForSelector(actions.waitForSelectorHidden, { hidden: true });
    }

    // 自定义延迟
    if (actions.delay) {
      await new Promise((resolve) => setTimeout(resolve, actions.delay));
    }

    // 注入 CSS
    if (actions.injectCSS) {
      await page.addStyleTag({ content: actions.injectCSS });
    }

    // 注入 JavaScript
    if (actions.injectJS) {
      await page.evaluate(actions.injectJS);
    }

    // 隐藏元素
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

    // 删除元素
    if (actions.removeElements && actions.removeElements.length > 0) {
      await page.evaluate((selectors) => {
        selectors.forEach((selector: string) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => el.remove());
        });
      }, actions.removeElements);
    }

    // 点击元素
    if (actions.clickElement) {
      await page.click(actions.clickElement);
    }

    // 滚动到元素
    if (actions.scrollToElement) {
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, actions.scrollToElement);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待滚动完成
    }

    // 填充表单
    if (actions.fillForm && actions.fillForm.length > 0) {
      for (const field of actions.fillForm) {
        await page.type(field.selector, field.value);
      }
    }

    // 等待导航
    if (actions.waitForNavigation) {
      await page.waitForNavigation();
    }
  }

  /**
   * 设置页面环境
   */
  private async setupPageEnvironment(page: Page, options: ScreenshotOptions): Promise<void> {
    // 设置区域
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

    // 设置时区
    if (options.timezone) {
      await page.evaluateOnNewDocument((tz) => {
        // @ts-expect-error - 时区设置
        Intl.DateTimeFormat.prototype.resolvedOptions = function () {
          return { timeZone: tz };
        };
      }, options.timezone);
    }

    // 设置地理位置
    if (options.geolocation) {
      await page.setGeolocation(options.geolocation);
    }

    // 设置离线模式
    if (options.offline) {
      await page.setOfflineMode(true);
    }

    // 设置暗黑模式
    if (options.darkMode) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    }

    // 禁用JavaScript
    if (options.javascript === false) {
      await page.setJavaScriptEnabled(false);
    }
  }

  /**
   * 生成 PDF
   */
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
      pdfOptions.width = options.width ? `${options.width}px` : undefined;
      pdfOptions.height = options.height ? `${options.height}px` : undefined;
    }

    return Buffer.from(await page.pdf(pdfOptions));
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(options: ScreenshotOptions): string {
    if (options.cacheKey) {
      return options.cacheKey;
    }

    // 生成基于选项的缓存键
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

  /**
   * 检查缓存
   */
  private checkCache(key: string, ttl: number = 300): Buffer | null {
    const cached = this.cache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < ttl * 1000) {
        console.log(`Cache hit for key: ${key.substring(0, 20)}...`);
        return cached.data;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  /**
   * 截取网页截图（增强版）
   */
  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    // 检查缓存
    if (options.cacheTTL) {
      const cacheKey = this.getCacheKey(options);
      const cached = this.checkCache(cacheKey, options.cacheTTL);
      if (cached) {
        return {
          success: true,
          screenshot: cached,
          metadata: {
            width: options.width || 1920,
            height: options.height || 1080,
            size: cached.length,
            format: options.type || 'webp',
          },
        };
      }
    }

    let page: Page | null = null;

    try {
      // 验证 URL
      try {
        new URL(options.url);
      } catch {
        throw new Error('Invalid URL format');
      }

      const browser = await this.getBrowser();
      page = await browser.newPage();

      // 设置认证
      if (options.auth) {
        await this.setupAuth(page, options.auth);
      }

      // 设置忽略HTTPS错误
      if (options.ignoreHTTPSErrors) {
        await page.setBypassCSP(true);
      }

      // 设置设备模拟
      if (options.device || options.customDevice) {
        const device = options.customDevice || getDevice(options.device!);
        if (device) {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
        }
      } else {
        // 设置默认视口
        await page.setViewport({
          width: options.width || 1920,
          height: options.height || 1080,
        });
      }

      // 设置页面环境
      await this.setupPageEnvironment(page, options);

      // 设置超时
      const timeout = options.timeout || this.config.defaultTimeout || 30000;
      page.setDefaultTimeout(timeout);

      // 访问网页
      await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle2',
        timeout,
      });

      // 执行页面操作
      if (options.actions) {
        await this.executePageActions(page, options.actions);
      }

      // 提取元数据
      const title = await page.title();
      const description = await page.evaluate(() => {
        const metaDescription = document.querySelector('meta[name="description"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        return (
          metaDescription?.getAttribute('content') || ogDescription?.getAttribute('content') || ''
        );
      });

      let screenshot: Buffer;

      // 生成 PDF
      if (options.type === 'pdf') {
        screenshot = await this.generatePDF(page, options);
      } else {
        // 处理元素选择器截图
        if (options.selector) {
          const element = await page.$(options.selector);
          if (!element) {
            throw new Error(`Element not found: ${options.selector}`);
          }
          screenshot = (await element.screenshot({
            type: (options.type as any) || 'webp',
            quality: options.quality || 90,
          })) as Buffer;
        }
        // 处理裁剪区域
        else if (options.clip) {
          screenshot = (await page.screenshot({
            type: (options.type as any) || 'webp',
            quality: options.quality || 90,
            clip: options.clip,
          })) as Buffer;
        }
        // 处理全页面或视口截图
        else {
          screenshot = (await page.screenshot({
            type: (options.type as any) || 'webp',
            quality: options.quality || 90,
            fullPage: options.fullPage || false,
          })) as Buffer;
        }
      }

      // 缓存结果
      if (options.cacheTTL) {
        const cacheKey = this.getCacheKey(options);
        this.cache.set(cacheKey, {
          data: screenshot,
          timestamp: Date.now(),
        });
      }

      // 计算元数据
      const metadata = {
        width: options.width || 1920,
        height: options.height || 1080,
        size: screenshot.length,
        format: options.type || 'webp',
      };

      // 如果是全页面截图，获取实际尺寸
      if (options.fullPage && options.type !== 'pdf') {
        const dimensions = await page.evaluate(() => {
          return {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          };
        });
        metadata.width = dimensions.width;
        metadata.height = dimensions.height;
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
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * 关闭浏览器实例
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.clearCache();
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

// 导出工厂函数
export function createEnhancedScreenshotService(config?: BrowserConfig): EnhancedScreenshotService {
  return new EnhancedScreenshotService(config);
}
