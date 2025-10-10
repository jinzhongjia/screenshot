/**
 * 基本使用示例
 */

import { createScreenshotService, ScreenshotService } from '../src';
import type { ScreenshotOptions, ScreenshotResult } from '../src';

// 示例 1: 简单截图
async function simpleCapture() {
  console.log('📸 示例 1: 简单截图');

  const service = createScreenshotService();

  const result = await service.capture({
    url: 'https://example.com',
    width: 1920,
    height: 1080,
  });

  if (result.success) {
    console.log('✅ 截图成功');
    console.log('   标题:', result.title);
    console.log('   描述:', result.description);
    console.log('   大小:', result.metadata?.size, 'bytes');

    // 保存到文件
    await Bun.write('example-simple.webp', result.screenshot!);
  } else {
    console.error('❌ 截图失败:', result.error);
  }

  await service.close();
}

// 示例 2: 全页面截图
async function fullPageCapture() {
  console.log('\n📸 示例 2: 全页面截图');

  const service = new ScreenshotService({
    headless: true,
    defaultTimeout: 60000,
  });

  const result = await service.capture({
    url: 'https://github.com',
    fullPage: true,
    type: 'png',
  });

  if (result.success) {
    console.log('✅ 全页面截图成功');
    console.log('   实际尺寸:', `${result.metadata?.width}x${result.metadata?.height}`);

    await Bun.write('github-fullpage.png', result.screenshot!);
  }

  await service.close();
}

// 示例 3: 批量截图
async function batchCapture() {
  console.log('\n📸 示例 3: 批量截图');

  const urls = ['https://example.com', 'https://bun.sh', 'https://www.typescriptlang.org'];

  const service = createScreenshotService();
  const results: ScreenshotResult[] = [];

  for (const url of urls) {
    console.log(`   正在截图: ${url}`);

    const result = await service.capture({
      url,
      width: 1280,
      height: 720,
      type: 'jpeg',
      quality: 85,
    });

    results.push(result);

    if (result.success) {
      const filename = `batch-${url.replace(/[^a-z0-9]/gi, '_')}.jpeg`;
      await Bun.write(filename, result.screenshot!);
      console.log(`   ✅ 已保存: ${filename}`);
    } else {
      console.log(`   ❌ 失败: ${result.error}`);
    }
  }

  await service.close();

  // 统计
  const successful = results.filter((r) => r.success).length;
  console.log(`\n📊 批量截图完成: ${successful}/${urls.length} 成功`);
}

// 示例 4: 自定义配置
async function customConfig() {
  console.log('\n📸 示例 4: 自定义配置');

  const service = new ScreenshotService({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultTimeout: 45000,
  });

  const options: ScreenshotOptions = {
    url: 'https://www.google.com',
    width: 1440,
    height: 900,
    type: 'webp',
    quality: 95,
    waitUntil: 'networkidle0',
    timeout: 30000,
  };

  const result = await service.capture(options);

  if (result.success) {
    console.log('✅ 自定义配置截图成功');
    console.log('   格式:', result.metadata?.format);
    console.log('   大小:', Math.round(result.metadata!.size / 1024), 'KB');

    await Bun.write('google-custom.webp', result.screenshot!);
  }

  await service.close();
}

// 示例 5: 错误处理
async function errorHandling() {
  console.log('\n📸 示例 5: 错误处理');

  const service = createScreenshotService();

  // 测试无效 URL
  const result = await service.capture({
    url: 'not-a-valid-url',
    width: 1920,
    height: 1080,
  });

  if (!result.success) {
    console.log('✅ 正确处理了无效 URL:', result.error);
  }

  // 测试超时
  const timeoutResult = await service.capture({
    url: 'https://httpstat.us/200?sleep=60000',
    timeout: 5000,
  });

  if (!timeoutResult.success) {
    console.log('✅ 正确处理了超时:', timeoutResult.error);
  }

  await service.close();
}

// 主函数
async function main() {
  console.log('🚀 Screenshot Service 使用示例\n');
  console.log('='.repeat(50));

  try {
    await simpleCapture();
    await fullPageCapture();
    await batchCapture();
    await customConfig();
    await errorHandling();

    console.log('\n✨ 所有示例运行完成！');
  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
  }
}

// 运行示例
if (import.meta.main) {
  main();
}
