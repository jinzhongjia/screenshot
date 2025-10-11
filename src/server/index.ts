/**
 * API 服务器入口
 */

import { ApiServer } from './api';
import type { ServerConfig } from '../types';

// 从环境变量读取配置
const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  cors: process.env.CORS !== 'false',
  enableDemo: process.env.ENABLE_DEMO !== 'false',
  browser: {
    headless: process.env.HEADLESS !== 'false',
    defaultTimeout: parseInt(process.env.TIMEOUT || '30000'),
    acquireTimeout: parseInt(process.env.ACQUIRE_TIMEOUT || '0') || undefined,
    keepAliveMillis: parseInt(process.env.KEEP_ALIVE || '0') || undefined,
    maxPagesPerBrowser: parseInt(process.env.MAX_PAGES_PER_BROWSER || '0') || undefined,
    maxBrowsersPerConfig: parseInt(process.env.MAX_BROWSERS_PER_CONFIG || '0') || undefined,
  },
  pool: {
    maxTotalBrowsers: parseInt(process.env.MAX_TOTAL_BROWSERS || '0') || undefined,
    acquireTimeout: parseInt(process.env.POOL_ACQUIRE_TIMEOUT || '0') || undefined,
    keepAliveMillis: parseInt(process.env.POOL_KEEP_ALIVE || '0') || undefined,
  },
};

// 创建并启动服务器
const server = new ApiServer(config);

async function start() {
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await server.stop();
  process.exit(0);
});

// 启动服务器
start();
