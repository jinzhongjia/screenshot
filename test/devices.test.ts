import { test, expect, describe } from 'bun:test';
import { getDevice, DEVICE_PRESETS } from '../src';

describe('Device Presets', () => {
  describe('getDevice', () => {
    test('should return iPhone 12 preset', () => {
      const device = getDevice('iPhone 12');

      expect(device).toBeDefined();
      expect(device?.name).toBe('iPhone 12');
      expect(device?.viewport.width).toBe(390);
      expect(device?.viewport.height).toBe(844);
      expect(device?.viewport.isMobile).toBe(true);
      expect(device?.viewport.hasTouch).toBe(true);
      expect(device?.userAgent).toContain('iPhone');
    });

    test('should return iPad preset', () => {
      const device = getDevice('iPad');

      expect(device).toBeDefined();
      expect(device?.name).toBe('iPad');
      expect(device?.viewport.width).toBe(768);
      expect(device?.viewport.height).toBe(1024);
      expect(device?.viewport.isMobile).toBe(true);
      expect(device?.viewport.hasTouch).toBe(true);
    });

    test('should return Desktop 1080p preset', () => {
      const device = getDevice('Desktop 1080p');

      expect(device).toBeDefined();
      expect(device?.name).toBe('Desktop 1080p');
      expect(device?.viewport.width).toBe(1920);
      expect(device?.viewport.height).toBe(1080);
      expect(device?.viewport.isMobile).toBe(false);
      expect(device?.viewport.hasTouch).toBe(false);
      expect(device?.viewport.isLandscape).toBe(true);
    });

    test('should return undefined for non-existent device', () => {
      const device = getDevice('Non Existent Device');

      expect(device).toBeUndefined();
    });

    test('should handle case-sensitive device names', () => {
      const device = getDevice('iphone 12'); // lowercase

      expect(device).toBeUndefined();
    });
  });

  describe('DEVICE_PRESETS', () => {
    test('should contain iPhone devices', () => {
      expect(DEVICE_PRESETS['iPhone 12']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 12 Pro']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 12 Pro Max']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone SE']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 13']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 13 Pro']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 13 Pro Max']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 14']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 14 Pro']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 14 Pro Max']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 15']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 15 Pro']).toBeDefined();
      expect(DEVICE_PRESETS['iPhone 15 Pro Max']).toBeDefined();
    });

    test('should contain iPad devices', () => {
      expect(DEVICE_PRESETS['iPad']).toBeDefined();
      expect(DEVICE_PRESETS['iPad Pro']).toBeDefined();
      expect(DEVICE_PRESETS['iPad Mini']).toBeDefined();
    });

    test('should contain Android devices', () => {
      expect(DEVICE_PRESETS['Pixel 5']).toBeDefined();
      expect(DEVICE_PRESETS['Pixel 6']).toBeDefined();
      expect(DEVICE_PRESETS['Pixel 7']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy S20']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy S21']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy S22']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy S23']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy S23 Ultra']).toBeDefined();
      expect(DEVICE_PRESETS['OnePlus 9 Pro']).toBeDefined();
      expect(DEVICE_PRESETS['Xiaomi Mi 11']).toBeDefined();
      expect(DEVICE_PRESETS['Samsung Galaxy Tab S8']).toBeDefined();
    });

    test('should contain Desktop devices', () => {
      expect(DEVICE_PRESETS['Desktop 1080p']).toBeDefined();
      expect(DEVICE_PRESETS['Desktop 1440p']).toBeDefined();
      expect(DEVICE_PRESETS['Desktop 4K']).toBeDefined();
      expect(DEVICE_PRESETS['MacBook Air']).toBeDefined();
      expect(DEVICE_PRESETS['MacBook Pro 13']).toBeDefined();
      expect(DEVICE_PRESETS['MacBook Pro 16']).toBeDefined();
      expect(DEVICE_PRESETS['Laptop 720p']).toBeDefined();
    });

    test('all devices should have required properties', () => {
      Object.values(DEVICE_PRESETS).forEach((device) => {
        expect(device.name).toBeDefined();
        expect(device.userAgent).toBeDefined();
        expect(device.viewport).toBeDefined();
        expect(device.viewport.width).toBeGreaterThan(0);
        expect(device.viewport.height).toBeGreaterThan(0);
        expect(device.viewport.deviceScaleFactor).toBeGreaterThan(0);
        expect(typeof device.viewport.isMobile).toBe('boolean');
        expect(typeof device.viewport.hasTouch).toBe('boolean');
        expect(typeof device.viewport.isLandscape).toBe('boolean');
      });
    });

    test('mobile devices should have touch enabled', () => {
      const mobileDevices = Object.values(DEVICE_PRESETS).filter((d) => d.viewport.isMobile);

      mobileDevices.forEach((device) => {
        expect(device.viewport.hasTouch).toBe(true);
      });
    });

    test('desktop devices should not be mobile', () => {
      const desktopDevices = [
        'Desktop 1080p',
        'Desktop 1440p',
        'Desktop 4K',
        'MacBook Air',
        'MacBook Pro 13',
        'MacBook Pro 16',
        'Laptop 720p',
      ];

      desktopDevices.forEach((deviceName) => {
        const device = DEVICE_PRESETS[deviceName];
        expect(device.viewport.isMobile).toBe(false);
        expect(device.viewport.hasTouch).toBe(false);
        expect(device.viewport.isLandscape).toBe(true);
      });
    });

    test('portrait devices should have height > width', () => {
      const portraitDevices = Object.values(DEVICE_PRESETS).filter((d) => !d.viewport.isLandscape);

      portraitDevices.forEach((device) => {
        expect(device.viewport.height).toBeGreaterThan(device.viewport.width);
      });
    });

    test('landscape devices should have width > height', () => {
      const landscapeDevices = Object.values(DEVICE_PRESETS).filter((d) => d.viewport.isLandscape);

      landscapeDevices.forEach((device) => {
        expect(device.viewport.width).toBeGreaterThan(device.viewport.height);
      });
    });

    test('user agents should contain browser identifiers', () => {
      Object.values(DEVICE_PRESETS).forEach((device) => {
        const ua = device.userAgent.toLowerCase();
        const hasValidUA =
          ua.includes('mozilla') ||
          ua.includes('webkit') ||
          ua.includes('chrome') ||
          ua.includes('safari');

        expect(hasValidUA).toBe(true);
      });
    });
  });

  describe('Device Categories', () => {
    test('should have various iPhone models', () => {
      const iPhones = Object.keys(DEVICE_PRESETS).filter((key) => key.startsWith('iPhone'));

      expect(iPhones.length).toBeGreaterThan(10);
    });

    test('should have iPad models', () => {
      const iPads = Object.keys(DEVICE_PRESETS).filter((key) => key.startsWith('iPad'));

      expect(iPads.length).toBeGreaterThanOrEqual(3);
    });

    test('should have Android devices', () => {
      const android = Object.keys(DEVICE_PRESETS).filter(
        (key) =>
          key.includes('Pixel') ||
          key.includes('Samsung') ||
          key.includes('OnePlus') ||
          key.includes('Xiaomi')
      );

      expect(android.length).toBeGreaterThan(8);
    });

    test('should have Desktop devices', () => {
      const desktops = Object.keys(DEVICE_PRESETS).filter(
        (key) => key.includes('Desktop') || key.includes('MacBook') || key.includes('Laptop')
      );

      expect(desktops.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Specific Device Validation', () => {
    test('iPhone 15 Pro Max should have correct dimensions', () => {
      const device = getDevice('iPhone 15 Pro Max');

      expect(device?.viewport.width).toBe(430);
      expect(device?.viewport.height).toBe(932);
      expect(device?.viewport.deviceScaleFactor).toBe(3);
    });

    test('iPad Pro should have correct dimensions', () => {
      const device = getDevice('iPad Pro');

      expect(device?.viewport.width).toBe(1024);
      expect(device?.viewport.height).toBe(1366);
      expect(device?.viewport.deviceScaleFactor).toBe(2);
    });

    test('Desktop 4K should have correct dimensions', () => {
      const device = getDevice('Desktop 4K');

      expect(device?.viewport.width).toBe(3840);
      expect(device?.viewport.height).toBe(2160);
      expect(device?.viewport.deviceScaleFactor).toBe(1);
    });

    test('Samsung Galaxy S23 Ultra should have high DPR', () => {
      const device = getDevice('Samsung Galaxy S23 Ultra');

      expect(device?.viewport.deviceScaleFactor).toBe(3.5);
    });
  });
});
