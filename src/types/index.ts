import type { Browser } from 'puppeteer';

/**
 * Type definitions for the screenshot service
 */

/**
 * Device preset
 */
export interface DevicePreset {
  /** Device name */
  name: string;
  /** User agent */
  userAgent: string;
  /** Viewport configuration */
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    isLandscape: boolean;
  };
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Basic authentication */
  basic?: {
    username: string;
    password: string;
  };
  /** Bearer Token */
  bearer?: string;
  /** Custom request headers */
  headers?: Record<string, string>;
  /** Cookies */
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
}

/**
 * Page actions configuration
 */
export interface PageActions {
  /** Wait for element to appear */
  waitForSelector?: string;
  /** Wait for element to disappear */
  waitForSelectorHidden?: string;
  /** Wait for navigation */
  waitForNavigation?: boolean;
  /** Custom wait time (milliseconds) */
  delay?: number;
  /** Injected CSS */
  injectCSS?: string;
  /** Injected JavaScript */
  injectJS?: string;
  /** Hide elements (CSS selectors) */
  hideElements?: string[];
  /** Remove elements (CSS selectors) */
  removeElements?: string[];
  /** Click element */
  clickElement?: string;
  /** Scroll to element */
  scrollToElement?: string;
  /** Fill form */
  fillForm?: Array<{
    selector: string;
    value: string;
  }>;
}

/**
 * Screenshot options configuration
 */
export interface ScreenshotOptions {
  /** Target webpage URL */
  url: string;
  /** Screenshot width (pixels), default 1920 */
  width?: number;
  /** Screenshot height (pixels), default 1080 */
  height?: number;
  /** Full page screenshot, default false */
  fullPage?: boolean;
  /** Screenshot quality (1-100), only effective for jpeg and webp formats */
  quality?: number;
  /** Screenshot format */
  type?: 'webp' | 'jpeg' | 'png';
  /** Wait strategy */
  waitUntil?: /**
     * Waits for the 'load' event.
     */
    | 'load'
    /**
     * Waits for the 'DOMContentLoaded' event.
     */
    | 'domcontentloaded'
    /**
     * Waits till there are no more than 0 network connections for at least `500`
     * ms.
     */
    | 'networkidle0'
    /**
     * Waits till there are no more than 2 network connections for at least `500`
     * ms.
     */
    | 'networkidle2';
  /** Timeout (milliseconds) */
  timeout?: number;
  /** Device emulation */
  device?:
    | 'iPhone 12'
    | 'iPhone 12 Pro'
    | 'iPhone 12 Pro Max'
    | 'iPad'
    | 'iPad Pro'
    | 'Pixel 5'
    | 'Samsung Galaxy S21'
    | string;
  /** Custom device configuration */
  customDevice?: DevicePreset;
  /** Element selector (capture specific element only) */
  selector?: string;
  /** Clip region */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Page actions */
  actions?: PageActions;
  /** Enable JavaScript, default true */
  javascript?: boolean;
  /** Ignore HTTPS errors */
  ignoreHTTPSErrors?: boolean;
  /** Dark mode */
  darkMode?: boolean;
  /** Locale setting */
  locale?: string;
  /** Timezone */
  timezone?: string;
  /** Geolocation */
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  /** Offline mode */
  offline?: boolean;
  /** Cache key (for caching) */
  cacheKey?: string;
  /** Cache TTL (seconds) */
  cacheTTL?: number;
  /** Request-level browser config, merged with service default config */
  browser?: BrowserConfig;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Success status */
  success: boolean;
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Screenshot binary data */
  screenshot?: Buffer;
  /** Error message */
  error?: string;
  /** Metadata */
  metadata?: {
    /** Actual screenshot width */
    width: number;
    /** Actual screenshot height */
    height: number;
    /** File size (bytes) */
    size: number;
    /** Screenshot format */
    format: string;
  };
}

/**
 * API JSON response format
 */
export interface ApiJsonResponse {
  /** Success status */
  success: boolean;
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Base64 encoded screenshot data */
  screenshot?: string;
  /** Error message */
  error?: string;
  /** Metadata */
  metadata?: {
    /** Actual screenshot width */
    width: number;
    /** Actual screenshot height */
    height: number;
    /** File size (bytes) */
    size: number;
    /** Screenshot format */
    format: string;
  };
}

/**
 * Browser configuration options
 */
export interface BrowserConfig {
  /** Headless mode */
  headless?: boolean;
  /** Launch arguments */
  args?: string[];
  /** Executable path */
  executablePath?: string;
  /** Default timeout */
  defaultTimeout?: number;
  /** Browser acquire timeout (milliseconds) */
  acquireTimeout?: number;
  /** Custom pool key, can be used to share resources with other configs */
  poolKey?: string;
  /** Maximum concurrent pages per browser */
  maxPagesPerBrowser?: number;
  /** Maximum browser instances per config pool */
  maxBrowsersPerConfig?: number;
  /** Idle browser keep-alive duration (milliseconds) */
  keepAliveMillis?: number;
}

export interface BrowserPoolConfig {
  /** Maximum total browsers across all pools */
  maxTotalBrowsers?: number;
  /** Default browser acquire timeout (milliseconds) */
  acquireTimeout?: number;
  /** Browser idle close time (milliseconds) */
  keepAliveMillis?: number;
}

export interface BrowserPoolAcquireOptions {
  config: BrowserConfig;
  timeout?: number;
}

export interface BrowserPoolAcquireResult {
  browser: Browser;
  poolKey: string;
}
