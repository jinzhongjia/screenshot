import puppeteer, { type Browser } from 'puppeteer';
import type {
  BrowserConfig,
  BrowserPoolAcquireOptions,
  BrowserPoolAcquireResult,
  BrowserPoolConfig,
} from '../types';

type PendingRequest = {
  resolve: (result: BrowserPoolAcquireResult) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
};

type PoolState = {
  config: BrowserConfig;
  browsers: Set<Browser>;
  usage: Map<Browser, number>;
  available: Set<Browser>;
  pending: PendingRequest[];
  idleTimers: Map<Browser, NodeJS.Timeout>;
};

/**
 * Simple async mutex lock for protecting critical sections
 */
class AsyncMutex {
  private locked = false;
  private waiting: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Execute a function while holding the lock
   */
  async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const DEFAULT_GLOBAL_CONFIG: Required<BrowserPoolConfig> = {
  maxTotalBrowsers: 4,
  acquireTimeout: 30_000,
  keepAliveMillis: 60_000,
};

function sanitizeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function uniqueArgs(args: string[] | undefined): string[] | undefined {
  if (!args) {
    return undefined;
  }
  return Array.from(new Set(args));
}

export class BrowserPoolManager {
  private static instance: BrowserPoolManager | null = null;

  private readonly pools = new Map<string, PoolState>();
  private totalBrowsers = 0;
  private closed = false;
  private globalConfig: BrowserPoolConfig;
  private readonly mutex = new AsyncMutex();

  constructor(config: BrowserPoolConfig = {}) {
    this.globalConfig = { ...config };
  }

  static getDefaultInstance(config: BrowserPoolConfig = {}): BrowserPoolManager {
    if (!BrowserPoolManager.instance) {
      BrowserPoolManager.instance = new BrowserPoolManager(config);
    } else if (Object.keys(config).length > 0) {
      BrowserPoolManager.instance.configure(config);
    }

    return BrowserPoolManager.instance;
  }

  configure(config: BrowserPoolConfig = {}): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  async acquire(options: BrowserPoolAcquireOptions): Promise<BrowserPoolAcquireResult> {
    return await this.mutex.withLock(async () => {
      if (this.closed) {
        throw new Error('BrowserPoolManager has been shut down');
      }

      const normalizedConfig = this.normalizeConfig(options.config);
      const poolKey = this.getPoolKey(normalizedConfig);
      const pool = this.ensurePool(poolKey, normalizedConfig);

      const availableBrowser = this.takeAvailableBrowser(pool);
      if (availableBrowser) {
        return { browser: availableBrowser, poolKey };
      }

      const maybeBrowser = await this.maybeCreateBrowser(poolKey, pool);
      if (maybeBrowser) {
        return { browser: maybeBrowser, poolKey };
      }

      return await this.enqueuePendingRequest(poolKey, pool, options);
    });
  }

  async release(poolKey: string, browser: Browser): Promise<void> {
    await this.mutex.withLock(async () => {
      const pool = this.pools.get(poolKey);
      if (!pool || !pool.browsers.has(browser)) {
        return;
      }

      const usage = pool.usage.get(browser) ?? 0;
      if (usage <= 0) {
        return;
      }

      const nextUsage = usage - 1;
      pool.usage.set(browser, nextUsage);

      if (nextUsage < this.getBrowserUsageLimit(pool.config)) {
        pool.available.add(browser);
      }

      await this.processPending(poolKey, pool);

      const usageAfter = pool.usage.get(browser) ?? 0;
      if (usageAfter === 0 && pool.pending.length === 0) {
        this.scheduleIdleClose(poolKey, pool, browser);
      }
    });
  }

  async invalidate(poolKey: string, browser: Browser, reason?: unknown): Promise<void> {
    await this.mutex.withLock(async () => {
      const pool = this.pools.get(poolKey);
      if (!pool || !pool.browsers.has(browser)) {
        return;
      }

      this.clearIdleTimer(pool, browser);
      pool.available.delete(browser);
      pool.usage.delete(browser);
      pool.browsers.delete(browser);
      this.totalBrowsers = Math.max(0, this.totalBrowsers - 1);

      try {
        await browser.close();
      } catch (error) {
        console.error('Failed to close browser during invalidate:', error);
      }

      if (reason instanceof Error) {
        console.warn('Browser instance invalidated:', reason.message);
      }

      await this.processPending(poolKey, pool);

      if (pool.browsers.size === 0 && pool.pending.length === 0) {
        this.pools.delete(poolKey);
      }
    });
  }

  async drain(): Promise<void> {
    await this.performShutdown(false);
  }

  async shutdown(): Promise<void> {
    await this.performShutdown(true);
  }

  private async performShutdown(permanent: boolean): Promise<void> {
    await this.mutex.withLock(async () => {
      this.closed = true;

      const closeTasks: Array<Promise<void>> = [];

      for (const pool of this.pools.values()) {
        for (const pending of pool.pending.splice(0)) {
          if (pending.timeout) {
            clearTimeout(pending.timeout);
          }
          pending.reject(new Error('Browser pool shutting down'));
        }

        for (const browser of pool.browsers) {
          this.clearIdleTimer(pool, browser);
          closeTasks.push(
            browser
              .close()
              .catch((error) => console.error('Failed to close browser during shutdown:', error))
          );
        }

        pool.browsers.clear();
        pool.available.clear();
        pool.usage.clear();
        pool.idleTimers.clear();
      }

      this.pools.clear();
      this.totalBrowsers = 0;

      await Promise.all(closeTasks);

      this.closed = permanent;

      if (permanent) {
        if (BrowserPoolManager.instance === this) {
          BrowserPoolManager.instance = null;
        }
      } else {
        this.closed = false;
      }
    });
  }

  private ensurePool(poolKey: string, config: BrowserConfig): PoolState {
    let pool = this.pools.get(poolKey);
    if (!pool) {
      pool = {
        config,
        browsers: new Set(),
        usage: new Map(),
        available: new Set(),
        pending: [],
        idleTimers: new Map(),
      };
      this.pools.set(poolKey, pool);
    }

    return pool;
  }

  private async enqueuePendingRequest(
    poolKey: string,
    pool: PoolState,
    options: BrowserPoolAcquireOptions
  ): Promise<BrowserPoolAcquireResult> {
    const timeoutMs = this.resolveAcquireTimeout(pool.config, options.timeout);

    return await new Promise<BrowserPoolAcquireResult>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
      };

      if (timeoutMs > 0) {
        pending.timeout = setTimeout(() => {
          pool.pending = pool.pending.filter((item) => item !== pending);
          reject(new Error(`Timed out acquiring browser after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      pool.pending.push(pending);
    });
  }

  private async processPending(poolKey: string, pool: PoolState): Promise<void> {
    while (pool.pending.length > 0) {
      const browserFromPool = this.takeAvailableBrowser(pool);
      if (browserFromPool) {
        const pending = pool.pending.shift();
        if (!pending) {
          break;
        }
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        pending.resolve({ browser: browserFromPool, poolKey });
        continue;
      }

      const created = await this.maybeCreateBrowser(poolKey, pool);
      if (!created) {
        break;
      }

      const pending = pool.pending.shift();
      if (!pending) {
        await this.release(poolKey, created);
        break;
      }

      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.resolve({ browser: created, poolKey });
    }
  }

  private takeAvailableBrowser(pool: PoolState): Browser | null {
    const iterator = pool.available.values().next();
    if (iterator.done) {
      return null;
    }

    const browser = iterator.value;
    pool.available.delete(browser);

    const currentUsage = pool.usage.get(browser) ?? 0;
    const nextUsage = currentUsage + 1;
    pool.usage.set(browser, nextUsage);

    if (nextUsage < this.getBrowserUsageLimit(pool.config)) {
      pool.available.add(browser);
    }

    this.clearIdleTimer(pool, browser);

    return browser;
  }

  private async maybeCreateBrowser(poolKey: string, pool: PoolState): Promise<Browser | null> {
    if (!this.canCreateBrowser(pool)) {
      return null;
    }

    const browser = await this.launchBrowser(pool.config);
    this.registerBrowser(poolKey, pool, browser);

    return this.takeAvailableBrowser(pool);
  }

  private canCreateBrowser(pool: PoolState): boolean {
    const perConfigLimit = pool.config.maxBrowsersPerConfig ?? Infinity;
    const globalLimit = this.getMaxTotalBrowsers();

    if (perConfigLimit > 0 && pool.browsers.size >= perConfigLimit) {
      return false;
    }

    if (globalLimit > 0 && this.totalBrowsers >= globalLimit) {
      return false;
    }

    return true;
  }

  private registerBrowser(poolKey: string, pool: PoolState, browser: Browser): void {
    pool.browsers.add(browser);
    pool.usage.set(browser, 0);
    pool.available.add(browser);
    this.totalBrowsers += 1;

    browser.once('disconnected', () => {
      void this.invalidate(poolKey, browser, new Error('Browser disconnected'));
    });
  }

  private scheduleIdleClose(poolKey: string, pool: PoolState, browser: Browser): void {
    const keepAlive = this.resolveKeepAlive(pool.config);

    if (keepAlive <= 0) {
      void this.invalidate(poolKey, browser);
      return;
    }

    this.clearIdleTimer(pool, browser);

    const timer = setTimeout(() => {
      const usage = pool.usage.get(browser) ?? 0;
      if (usage > 0) {
        return;
      }
      void this.invalidate(poolKey, browser);
    }, keepAlive);

    pool.idleTimers.set(browser, timer);
  }

  private clearIdleTimer(pool: PoolState, browser: Browser): void {
    const timer = pool.idleTimers.get(browser);
    if (timer) {
      clearTimeout(timer);
      pool.idleTimers.delete(browser);
    }
  }

  private async launchBrowser(config: BrowserConfig): Promise<Browser> {
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: config.headless ?? true,
      args: config.args,
    };

    if (config.executablePath) {
      launchOptions.executablePath = config.executablePath;
    }

    return await puppeteer.launch(launchOptions);
  }

  private getPoolKey(config: BrowserConfig): string {
    if (config.poolKey) {
      return config.poolKey;
    }

    const normalized = {
      headless: config.headless ?? true,
      args: [...(config.args ?? [])].sort(),
      executablePath: config.executablePath ?? '',
    };

    return JSON.stringify(normalized);
  }

  private normalizeConfig(config: BrowserConfig): BrowserConfig {
    return {
      ...config,
      args: uniqueArgs(config.args),
    };
  }

  private getBrowserUsageLimit(config: BrowserConfig): number {
    const limit = config.maxPagesPerBrowser ?? 1;
    return limit > 0 ? limit : 1;
  }

  private resolveAcquireTimeout(config: BrowserConfig, override?: number): number {
    if (typeof override === 'number') {
      return Math.max(override, 0);
    }

    const fromConfig = sanitizeNumber(config.acquireTimeout, -1);
    if (fromConfig >= 0) {
      return fromConfig;
    }

    return Math.max(this.globalConfig.acquireTimeout ?? DEFAULT_GLOBAL_CONFIG.acquireTimeout, 0);
  }

  private resolveKeepAlive(config: BrowserConfig): number {
    const fromConfig = sanitizeNumber(config.keepAliveMillis, -1);
    if (fromConfig >= 0) {
      return fromConfig;
    }

    const globalValue = this.globalConfig.keepAliveMillis ?? DEFAULT_GLOBAL_CONFIG.keepAliveMillis;
    return Math.max(globalValue, 0);
  }

  private getMaxTotalBrowsers(): number {
    const value = this.globalConfig.maxTotalBrowsers;
    const sanitized = sanitizeNumber(value, DEFAULT_GLOBAL_CONFIG.maxTotalBrowsers);
    return sanitized <= 0 ? Infinity : sanitized;
  }
}
