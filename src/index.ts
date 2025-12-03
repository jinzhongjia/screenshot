/**
 * Screenshot Service Library
 *
 * Main export file for library usage
 */

// Export core classes and functions
export { ScreenshotService, createScreenshotService } from './core/screenshot';
export {
  EnhancedScreenshotService,
  createEnhancedScreenshotService,
} from './core/screenshot-enhanced';
export { DEVICE_PRESETS, getDevice } from './core/devices';

// Export all type definitions
export type {
  ScreenshotOptions,
  ScreenshotResult,
  ApiJsonResponse,
  BrowserConfig,
  BrowserPoolConfig,
  BrowserPoolAcquireOptions,
  BrowserPoolAcquireResult,
  DevicePreset,
  AuthConfig,
  PageActions,
} from './types';

// Convenient default export
import { EnhancedScreenshotService } from './core/screenshot-enhanced';
export default EnhancedScreenshotService;
