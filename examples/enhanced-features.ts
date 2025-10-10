/**
 * 增强功能使用示例
 */

import { createEnhancedScreenshotService } from '../src';

// 创建增强服务实例
const service = createEnhancedScreenshotService({
  headless: true,
  defaultTimeout: 30000,
});

// 示例 1: 移动设备模拟
async function mobileScreenshot() {
  console.log('📱 示例 1: iPhone 12 Pro 截图');

  const result = await service.capture({
    url: 'https://example.com',
    device: 'iPhone 12 Pro',
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ 移动设备截图成功');
    console.log(`   尺寸: ${result.metadata?.width}x${result.metadata?.height}`);
    await Bun.write('mobile-iphone12pro.webp', result.screenshot!);
  }
}

// 示例 2: 元素选择器截图
async function elementScreenshot() {
  console.log('\n🎯 示例 2: 只截取特定元素');

  const result = await service.capture({
    url: 'https://github.com',
    selector: '.Header', // 只截取页面头部
    type: 'png',
  });

  if (result.success) {
    console.log('✅ 元素截图成功');
    await Bun.write('element-header.png', result.screenshot!);
  }
}

// 示例 3: 页面操作后截图
async function pageActionsScreenshot() {
  console.log('\n🎬 示例 3: 执行页面操作后截图');

  const result = await service.capture({
    url: 'https://example.com',
    actions: {
      // 等待页面加载
      waitForSelector: 'h1',
      // 注入自定义CSS
      injectCSS: `
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        h1 {
          font-size: 48px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
      `,
      // 隐藏某些元素
      hideElements: ['.advertisement', '.cookie-banner'],
      // 延迟1秒
      delay: 1000,
    },
  });

  if (result.success) {
    console.log('✅ 页面操作截图成功');
    await Bun.write('page-actions.webp', result.screenshot!);
  }
}

// 示例 4: 认证页面截图
async function authenticatedScreenshot() {
  console.log('\n🔐 示例 4: 带认证的页面截图');

  const result = await service.capture({
    url: 'https://httpbin.org/basic-auth/user/pass',
    auth: {
      basic: {
        username: 'user',
        password: 'pass',
      },
    },
  });

  if (result.success) {
    console.log('✅ 认证页面截图成功');
    console.log('   标题:', result.title);
    await Bun.write('authenticated.webp', result.screenshot!);
  }
}

// 示例 5: PDF生成
async function generatePDF() {
  console.log('\n📄 示例 5: 生成PDF文档');

  const result = await service.capture({
    url: 'https://www.typescriptlang.org',
    type: 'pdf',
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ PDF生成成功');
    console.log('   大小:', Math.round(result.metadata!.size / 1024), 'KB');
    await Bun.write('document.pdf', result.screenshot!);
  }
}

// 示例 6: 暗黑模式截图
async function darkModeScreenshot() {
  console.log('\n🌙 示例 6: 暗黑模式截图');

  const result = await service.capture({
    url: 'https://github.com',
    darkMode: true,
    width: 1920,
    height: 1080,
  });

  if (result.success) {
    console.log('✅ 暗黑模式截图成功');
    await Bun.write('dark-mode.webp', result.screenshot!);
  }
}

// 示例 7: 地理位置模拟
async function geolocationScreenshot() {
  console.log('\n📍 示例 7: 地理位置模拟截图');

  const result = await service.capture({
    url: 'https://www.google.com/maps',
    geolocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 100,
    },
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
  });

  if (result.success) {
    console.log('✅ 地理位置模拟成功');
    await Bun.write('geolocation.webp', result.screenshot!);
  }
}

// 示例 8: 自定义视口裁剪
async function clipScreenshot() {
  console.log('\n✂️ 示例 8: 自定义裁剪区域');

  const result = await service.capture({
    url: 'https://example.com',
    clip: {
      x: 100,
      y: 100,
      width: 800,
      height: 600,
    },
  });

  if (result.success) {
    console.log('✅ 裁剪截图成功');
    console.log(`   裁剪尺寸: 800x600`);
    await Bun.write('clipped.webp', result.screenshot!);
  }
}

// 示例 9: 带缓存的截图
async function cachedScreenshot() {
  console.log('\n💾 示例 9: 带缓存的截图');

  // 第一次请求
  console.log('   第一次请求...');
  let start = Date.now();
  let result = await service.capture({
    url: 'https://example.com',
    cacheKey: 'example-homepage',
    cacheTTL: 60, // 缓存60秒
  });

  if (result.success) {
    console.log(`   ✅ 耗时: ${Date.now() - start}ms`);
  }

  // 第二次请求（应该从缓存返回）
  console.log('   第二次请求（从缓存）...');
  start = Date.now();
  result = await service.capture({
    url: 'https://example.com',
    cacheKey: 'example-homepage',
    cacheTTL: 60,
  });

  if (result.success) {
    console.log(`   ✅ 耗时: ${Date.now() - start}ms (应该更快)`);
    await Bun.write('cached.webp', result.screenshot!);
  }
}

// 示例 10: 填充表单后截图
async function formFillScreenshot() {
  console.log('\n📝 示例 10: 填充表单后截图');

  const result = await service.capture({
    url: 'https://github.com/login',
    actions: {
      waitForSelector: 'input[name="login"]',
      fillForm: [
        { selector: 'input[name="login"]', value: 'example@email.com' },
        { selector: 'input[name="password"]', value: 'password123' },
      ],
      delay: 1000,
    },
  });

  if (result.success) {
    console.log('✅ 表单填充截图成功');
    await Bun.write('form-filled.webp', result.screenshot!);
  }
}

// 示例 11: 4K分辨率截图
async function highResScreenshot() {
  console.log('\n🖥️ 示例 11: 4K分辨率截图');

  const result = await service.capture({
    url: 'https://www.apple.com',
    device: 'Desktop 4K',
    type: 'jpeg',
    quality: 95,
  });

  if (result.success) {
    console.log('✅ 4K截图成功');
    console.log(`   尺寸: ${result.metadata?.width}x${result.metadata?.height}`);
    console.log('   大小:', Math.round(result.metadata!.size / 1024), 'KB');
    await Bun.write('4k-screenshot.jpeg', result.screenshot!);
  }
}

// 示例 12: 等待特定元素后截图
async function waitForElementScreenshot() {
  console.log('\n⏳ 示例 12: 等待特定元素出现');

  const result = await service.capture({
    url: 'https://example.com',
    actions: {
      // 等待特定元素出现
      waitForSelector: 'footer',
      // 滚动到底部
      scrollToElement: 'footer',
      // 等待动画完成
      delay: 2000,
      // 注入JS执行
      injectJS: `
        document.querySelector('h1').innerText = 'Screenshot Service Demo';
        document.body.style.transition = 'all 0.5s ease';
      `,
    },
    fullPage: true,
  });

  if (result.success) {
    console.log('✅ 等待元素截图成功');
    await Bun.write('wait-element.webp', result.screenshot!);
  }
}

// 主函数
async function main() {
  console.log('🚀 增强截图功能示例\n');
  console.log('='.repeat(50));

  try {
    await mobileScreenshot();
    await elementScreenshot();
    await pageActionsScreenshot();
    await authenticatedScreenshot();
    await generatePDF();
    await darkModeScreenshot();
    await geolocationScreenshot();
    await clipScreenshot();
    await cachedScreenshot();
    await formFillScreenshot();
    await highResScreenshot();
    await waitForElementScreenshot();

    console.log('\n✨ 所有增强功能示例运行完成！');

    // 清理缓存
    service.clearCache();
  } catch (error) {
    console.error('\n❌ 发生错误:', error);
  } finally {
    await service.close();
  }
}

// 运行示例
if (import.meta.main) {
  main();
}
