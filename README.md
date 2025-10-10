# Screenshot Service

高性能的网页截图服务与库，基于 Bun 和 Puppeteer 构建。

## ✨ 功能特性

### 核心功能

- 📷 **多种使用方式**：独立服务、库或 CLI 工具
- 🖼️ **多格式支持**：WebP、JPEG、PNG、PDF
- ⚡ **高性能**：基于 Bun 运行时，浏览器实例复用，内置缓存

### 增强功能

- 📱 **设备模拟**：iPhone、iPad、Android等设备预设
- 🎯 **精确控制**：元素选择器、自定义裁剪区域
- 🎬 **页面操作**：等待元素、注入CSS/JS、填充表单
- 🔐 **认证支持**：Basic Auth、Bearer Token、Cookies
- 🌙 **视觉模式**：暗黑模式、自定义样式
- 🌍 **环境模拟**：地理位置、时区、语言设置

## 🚀 快速开始

### 安装

```bash
# 安装依赖
bun install

# 或作为项目依赖安装
bun add @screenshot/service
```

### 作为服务运行

```bash
# 开发模式（带热重载）
bun run dev

# 生产模式
bun run start

# 使用环境变量配置
PORT=8080 HOST=0.0.0.0 bun run start
```

服务将在 `http://localhost:3000` 启动，访问根路径查看 API 文档。

### 作为库使用

```typescript
import { createScreenshotService } from '@screenshot/service';

// 创建服务实例
const service = createScreenshotService({
  headless: true,
  defaultTimeout: 30000,
});

// 截取网页
const result = await service.capture({
  url: 'https://example.com',
  width: 1920,
  height: 1080,
  fullPage: false,
  type: 'webp',
  quality: 90,
});

if (result.success) {
  console.log('标题:', result.title);
  console.log('描述:', result.description);

  // 保存截图
  await Bun.write('screenshot.webp', result.screenshot);
}

// 关闭浏览器
await service.close();
```

### CLI 工具使用

```bash
# 基本使用
bun run cli https://example.com

# 自定义选项
bun run cli https://example.com --width 1280 --height 720 --format png

# 全页面截图
bun run cli https://github.com --full-page --output github.png

# 使用远程 API
bun run cli https://example.com --use-api --api-url https://api.example.com/screenshot

# 查看帮助
bun run cli --help
```

## 📖 API 文档

### REST API

#### POST /screenshot

捕获网页截图。

**请求体（JSON）:**

```typescript
{
  "url": string,           // 必填：目标 URL
  "width"?: number,        // 视口宽度（默认：1920）
  "height"?: number,       // 视口高度（默认：1080）
  "fullPage"?: boolean,    // 全页面截图（默认：false）
  "format"?: "json"|"image" // 返回格式（默认："json"）
}
```

**响应（format: "json"）:**

```typescript
{
  "success": boolean,
  "title"?: string,
  "description"?: string,
  "screenshot"?: string,  // Base64 编码
  "metadata"?: {
    "width": number,
    "height": number,
    "size": number,
    "format": string
  },
  "error"?: string
}
```

#### GET /health

健康检查端点。

### 进阶使用

使用增强功能：

```typescript
import { createEnhancedScreenshotService } from '@screenshot/service';

const service = createEnhancedScreenshotService();

// 设备模拟
await service.capture({
  url: 'https://example.com',
  device: 'iPhone 12 Pro',
});

// 元素截图
await service.capture({
  url: 'https://github.com',
  selector: '.Header',
});

// 页面操作
await service.capture({
  url: 'https://example.com',
  actions: {
    waitForSelector: '.content',
    hideElements: ['.ads'],
    injectCSS: 'body { background: #000; }',
  },
});

// 记得关闭服务
await service.close();
```

## 🏗️ 项目结构

```
screenshot/
├── src/
│   ├── core/              # 核心功能
│   │   └── screenshot.ts  # 截图服务实现
│   ├── server/            # API 服务器
│   │   ├── api.ts        # API 处理逻辑
│   │   └── index.ts      # 服务器入口
│   ├── cli/              # CLI 工具
│   │   └── index.ts      # 命令行接口
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts      # 类型导出
│   └── index.ts          # 库主入口
├── public/               # 静态资源
│   └── demo.html        # 演示页面
├── index.ts             # 向后兼容入口
├── package.json
└── tsconfig.json
```

## 🔧 配置

通过环境变量配置服务：

```bash
PORT=3000                 # 服务端口
HOST=localhost           # 服务主机
HEADLESS=true            # 无头模式
TIMEOUT=30000            # 默认超时（毫秒）
```

## 📦 构建和发布

### 构建为独立可执行文件

Bun 支持将应用打包为独立的可执行文件，无需安装 Node.js 或 Bun 环境：

```bash
# 构建服务器可执行文件
bun run build:binary
# 生成 ./screenshot-server 可执行文件

# 构建 CLI 可执行文件
bun run build:cli-binary
# 生成 ./screenshot 可执行文件

# 直接运行可执行文件
./screenshot-server  # 启动服务器
./screenshot https://example.com  # CLI 截图
```

### 常规构建

```bash
# 构建库
bun run build
bun run build:lib  # 生成类型定义

# 清理构建产物
bun run clean

# 运行测试
bun test

# 发布到 npm
npm publish
```

## 🐳 Docker 支持

```dockerfile
FROM oven/bun:1-slim
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]
```

使用 Docker Compose：

```bash
docker-compose up -d
```

## 📝 许可证

MIT

## 🛠️ 技术栈

- [Bun](https://bun.sh) - JavaScript 运行时
- [Puppeteer](https://pptr.dev) - 无头浏览器自动化
- [TypeScript](https://www.typescriptlang.org) - 类型安全
