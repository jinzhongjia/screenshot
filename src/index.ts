/**
 * Screenshot Service Library
 *
 * 可以作为库使用的主导出文件
 */

// 导出核心类和函数
export { ScreenshotService, createScreenshotService } from './core/screenshot';
export {
  EnhancedScreenshotService,
  createEnhancedScreenshotService,
} from './core/screenshot-enhanced';
export { ApiServer } from './server/api';
export { DEVICE_PRESETS, getDevice } from './core/devices';

// 导出所有类型定义
export type {
  ScreenshotOptions,
  ScreenshotResult,
  ApiRequestBody,
  ApiJsonResponse,
  BrowserConfig,
  ServerConfig,
  DevicePreset,
  AuthConfig,
  PageActions,
} from './types';

// 便捷的默认导出
import { EnhancedScreenshotService } from './core/screenshot-enhanced';
export default EnhancedScreenshotService;
