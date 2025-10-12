import type { Browser } from 'puppeteer';

/**
 * 截图服务的类型定义
 */

/**
 * 设备预设
 */
export interface DevicePreset {
  /** 设备名称 */
  name: string;
  /** 用户代理 */
  userAgent: string;
  /** 视口配置 */
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
 * 认证配置
 */
export interface AuthConfig {
  /** 基本认证 */
  basic?: {
    username: string;
    password: string;
  };
  /** Bearer Token */
  bearer?: string;
  /** 自定义请求头 */
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
 * 页面操作配置
 */
export interface PageActions {
  /** 等待元素出现 */
  waitForSelector?: string;
  /** 等待元素消失 */
  waitForSelectorHidden?: string;
  /** 等待导航 */
  waitForNavigation?: boolean;
  /** 自定义等待时间（毫秒） */
  delay?: number;
  /** 注入的CSS */
  injectCSS?: string;
  /** 注入的JavaScript */
  injectJS?: string;
  /** 隐藏元素（CSS选择器） */
  hideElements?: string[];
  /** 删除元素（CSS选择器） */
  removeElements?: string[];
  /** 点击元素 */
  clickElement?: string;
  /** 滚动到元素 */
  scrollToElement?: string;
  /** 填充表单 */
  fillForm?: Array<{
    selector: string;
    value: string;
  }>;
}

/**
 * 截图选项配置
 */
export interface ScreenshotOptions {
  /** 目标网页 URL */
  url: string;
  /** 截图宽度（像素），默认 1920 */
  width?: number;
  /** 截图高度（像素），默认 1080 */
  height?: number;
  /** 是否全页面截图，默认 false */
  fullPage?: boolean;
  /** 截图质量（1-100），仅对 jpeg 格式有效 */
  quality?: number;
  /** 截图格式 */
  type?: 'webp' | 'jpeg' | 'png' | 'pdf';
  /** 等待策略 */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 设备模拟 */
  device?:
    | 'iPhone 12'
    | 'iPhone 12 Pro'
    | 'iPhone 12 Pro Max'
    | 'iPad'
    | 'iPad Pro'
    | 'Pixel 5'
    | 'Samsung Galaxy S21'
    | string;
  /** 自定义设备配置 */
  customDevice?: DevicePreset;
  /** 元素选择器（只截取特定元素） */
  selector?: string;
  /** 裁剪区域 */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** 认证配置 */
  auth?: AuthConfig;
  /** 页面操作 */
  actions?: PageActions;
  /** 是否启用JavaScript，默认 true */
  javascript?: boolean;
  /** 是否忽略HTTPS错误 */
  ignoreHTTPSErrors?: boolean;
  /** 暗黑模式 */
  darkMode?: boolean;
  /** 区域设置 */
  locale?: string;
  /** 时区 */
  timezone?: string;
  /** 地理位置 */
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  /** 离线模式 */
  offline?: boolean;
  /** 缓存键（用于缓存） */
  cacheKey?: string;
  /** 缓存TTL（秒） */
  cacheTTL?: number;
  /** 请求级浏览器配置，会与服务默认配置合并 */
  browser?: BrowserConfig;
}

/**
 * 截图结果
 */
export interface ScreenshotResult {
  /** 是否成功 */
  success: boolean;
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
  /** 截图二进制数据 */
  screenshot?: Buffer;
  /** 错误信息 */
  error?: string;
  /** 元数据 */
  metadata?: {
    /** 实际截图宽度 */
    width: number;
    /** 实际截图高度 */
    height: number;
    /** 文件大小（字节） */
    size: number;
    /** 截图格式 */
    format: string;
  };
}

/**
 * API 请求体
 */
export interface ApiRequestBody extends Omit<ScreenshotOptions, 'type'> {
  /** 返回格式 */
  format?: 'json' | 'image';
}

/**
 * API 响应（JSON格式）
 */
export interface ApiJsonResponse {
  success: boolean;
  title?: string;
  description?: string;
  /** Base64 编码的截图 */
  screenshot?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

/**
 * 浏览器配置选项
 */
export interface BrowserConfig {
  /** 是否无头模式 */
  headless?: boolean;
  /** 启动参数 */
  args?: string[];
  /** 执行路径 */
  executablePath?: string;
  /** 默认超时时间 */
  defaultTimeout?: number;
  /** 获取浏览器的等待超时时间（毫秒） */
  acquireTimeout?: number;
  /** 自定义池标识，可用于与其他配置共享资源 */
  poolKey?: string;
  /** 单浏览器允许的最大并发页面数 */
  maxPagesPerBrowser?: number;
  /** 单配置池允许的最大浏览器实例数 */
  maxBrowsersPerConfig?: number;
  /** 空闲浏览器保活时长（毫秒） */
  keepAliveMillis?: number;
}

export interface BrowserPoolConfig {
  /** 所有池合计的最大浏览器数量 */
  maxTotalBrowsers?: number;
  /** 默认获取浏览器超时时间（毫秒） */
  acquireTimeout?: number;
  /** 浏览器空闲关闭时间（毫秒） */
  keepAliveMillis?: number;
}

export interface BrowserPoolAcquireResult {
  browser: Browser;
  poolKey: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteHandlerContext {
  config: ServerConfig;
  screenshotService: import('../core/screenshot').ScreenshotService;
}

export type RouteHandler = (
  request: Request,
  context: RouteHandlerContext
) => Promise<Response> | Response;

export interface ApiRouteDefinition {
  path: string;
  methods?: HttpMethod | HttpMethod[];
  handler: RouteHandler;
}

export interface ApiServerOptions extends ServerConfig {
  routes?: ApiRouteDefinition[];
  screenshotService?: import('../core/screenshot').ScreenshotService;
}

/**
 * 服务配置
 */
export interface ServerConfig {
  /** 服务端口 */
  port?: number;
  /** 主机地址 */
  host?: string;
  /** 是否启用 CORS */
  cors?: boolean;
  /** 最大请求体大小 */
  maxBodySize?: string;
  /** 是否启用演示页面 */
  enableDemo?: boolean;
  /** 浏览器配置 */
  browser?: BrowserConfig;
  /** 浏览器池全局配置 */
  pool?: BrowserPoolConfig;
}
