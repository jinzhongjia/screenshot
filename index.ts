/**
 * 向后兼容的入口文件
 * 保持原有的 API 服务功能
 */

import { ApiServer } from './src/server/api';

// 从环境变量读取配置
const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  cors: process.env.CORS !== 'false',
  enableDemo: process.env.ENABLE_DEMO !== 'false',
  browser: {
    headless: process.env.HEADLESS !== 'false',
    defaultTimeout: parseInt(process.env.TIMEOUT || '30000'),
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
  console.log('\n正在关闭服务...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务...');
  await server.stop();
  process.exit(0);
});

// 启动服务器
start();
