# Screenshot Service

高性能网页截图解决方案，基于 [Bun](https://bun.sh) 与 [Puppeteer](https://pptr.dev) 构建。项目提供 API 服务、TypeScript/JavaScript 库以及丰富示例，帮助你在自动化场景中快速捕获并处理网页截图。

> 默认文档为英文版，参见 [README.md](./README.md)。

## 功能亮点

- 支持 `webp`、`png`、`jpeg`、`pdf` 等格式输出
- 自动提取页面标题与描述等元数据
- 内置多种设备模拟预设，支持自定义视口尺寸
- 高级能力：元素选择器截图、裁剪区域、暗黑模式、地理位置模拟、表单填充、注入脚本/样式等
- 可选缓存机制，加速重复截图
- 自带健康检查接口与交互式演示页面
- 提供 Docker 镜像与 docker-compose 配置，便于部署
- 丰富的 TypeScript 类型定义与示例

## 快速开始

### 环境要求

- [Bun](https://bun.sh) ≥ 1.0
- Chromium 依赖（可参考 `Dockerfile` 中的安装列表）

### 本地安装与运行

```bash
bun install

# 开发模式（热重载）
bun run dev

# 生产模式
bun run start
```

默认情况下，API 服务监听 `http://localhost:3000`。当 `ENABLE_DEMO=true` 时，可在根路径 `/` 访问演示页面。

### 构建产物

```bash
# 编译库代码与服务器产物
bun run build

# 仅生成 TypeScript 类型声明
bun run build:lib

# 生成功能性二进制文件
bun run build:binary
```

## 库使用示例

### 基本截图

```ts
import { createScreenshotService } from '@screenshot/service';

const service = createScreenshotService();

const result = await service.capture({
  url: 'https://example.com',
  width: 1280,
  height: 720,
  type: 'png',
});

if (result.success && result.screenshot) {
  await Bun.write('example.png', result.screenshot);
}

await service.close();
```

### 增强工作流

```ts
import { createEnhancedScreenshotService } from '@screenshot/service';

const service = createEnhancedScreenshotService();

await service.capture({
  url: 'https://github.com',
  fullPage: true,
  darkMode: true,
  device: 'Desktop 4K',
  actions: {
    waitForSelector: '.header',
    injectCSS: 'body { zoom: 0.9; }',
  },
});

await service.close();
```

更多完整示例可参考 `examples/` 目录，包括缓存、认证、PDF 生成、地理位置模拟等场景。

## API 说明

### 接口

- `GET /health`：返回 `{ status: 'healthy' | 'unhealthy', timestamp }`
- `POST /screenshot`：接受 JSON 请求体，并支持可选查询参数 `format`

### 请求体示例

```jsonc
{
  "url": "https://example.com",
  "width": 1280,
  "height": 720,
  "fullPage": false,
  "type": "webp",
  "device": "iPhone 12",
  "actions": {
    "waitForSelector": "#hero",
    "hideElements": [".ads"],
  },
  "format": "json",
}
```

### 响应格式

- `format=json`：返回元数据、标题、描述以及 Base64 编码截图数据
- `format=image`：直接返回二进制图片，附带正确的 `Content-Type`

请求示例：

```bash
curl -X POST http://localhost:3000/screenshot \
  -H 'Content-Type: application/json' \
  -d '{
        "url": "https://example.com",
        "fullPage": true,
        "format": "json"
      }'
```

## 配置项

通过环境变量调整服务行为：

| 变量                        | 默认值      | 说明                                                    |
| --------------------------- | ----------- | ------------------------------------------------------- |
| `PORT`                      | `3000`      | HTTP 端口                                               |
| `HOST`                      | `localhost` | 监听地址                                                |
| `CORS`                      | `true`      | 是否启用 CORS 头                                        |
| `ENABLE_DEMO`               | `true`      | 是否提供演示页面                                        |
| `HEADLESS`                  | `true`      | 是否以无头模式启动浏览器                                |
| `TIMEOUT`                   | `30000`     | 默认页面加载超时（毫秒）                                |
| `PUPPETEER_EXECUTABLE_PATH` | 自动检测    | 自定义 Chromium 路径（Docker 默认 `/usr/bin/chromium`） |
| `ACQUIRE_TIMEOUT`           | `0`（禁用） | 借用浏览器时的等待上限（毫秒）                          |
| `KEEP_ALIVE`                | `0`（禁用） | 空闲浏览器多久后自动关闭（毫秒）                        |
| `MAX_PAGES_PER_BROWSER`     | `0`（禁用） | 单个浏览器允许的并发行页面数                            |
| `MAX_BROWSERS_PER_CONFIG`   | `0`（禁用） | 单套配置允许的浏览器实例数                              |
| `MAX_TOTAL_BROWSERS`        | `4`         | 全局浏览器实例上限                                      |
| `POOL_ACQUIRE_TIMEOUT`      | `30000`     | 全局借用等待时长（毫秒）                                |
| `POOL_KEEP_ALIVE`           | `60000`     | 全局空闲关闭时长（毫秒）                                |

若通过 `ApiServer` 或 `createScreenshotService` 启动，可在 `ServerConfig.browser` 中传递更多浏览器配置。

### API 服务器使用

内置的 `ApiServer` 默认仅暴露两个接口：

- `GET /health`：健康检查
- `POST /screenshot`：截图接口（支持 `OPTIONS` 以处理 CORS）

你可以通过传入自定义路由扩展功能，每个路由都能访问服务器配置和截图服务实例。

```ts
import { ApiServer } from '@jinzhongjia/screenshot';

const server = new ApiServer({
  port: 8080,
  routes: [
    {
      path: '/version',
      methods: 'GET',
      handler: async (_req, { config }) =>
        new Response(JSON.stringify({ version: '0.0.2', port: config.port }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  ],
});

await server.start();
```

这样可以在保持核心 API 简洁的同时，方便将截图服务挂载到其他服务框架上。

### 浏览器连接池

服务通过可配置的浏览器池复用 Chromium 实例：

- 使用 `BrowserConfig.poolKey` 将不同配置划分至独立池。
- `maxPagesPerBrowser`、`maxBrowsersPerConfig` 控制单池内的扩容策略。
- `BrowserConfig.keepAliveMillis` 或 `pool.keepAliveMillis` 控制空闲浏览器的保活时间。
- `browser.acquireTimeout` 与 `pool.acquireTimeout` 用于限制在池满时的等待时长。

示例：

```ts
const service = createScreenshotService({
  args: ['--no-sandbox'],
  poolKey: 'default',
  maxPagesPerBrowser: 2,
  keepAliveMillis: 15000,
});

await service.capture({
  url: 'https://example.com',
  browser: {
    args: ['--disable-gpu'],
    poolKey: 'gpu-disabled',
    acquireTimeout: 5000,
  },
});
```

## Docker 与部署

使用 Docker 构建与运行：

```bash
docker build -t screenshot-service .
docker run -p 3000:3000 screenshot-service
```

或直接运行 docker-compose：

```bash
docker compose up --build
```

`Dockerfile` 与 `docker-compose.yml` 已预置健康检查与依赖安装。

## 代码质量与测试

```bash
# 检查格式
bun run format:check

# 执行 ESLint
bun run lint

# 统一检查
bun run check

# 运行测试
bun test
```

## 项目结构

```text
src/
├── core/            # 基础与增强截图引擎
├── server/          # API 服务实现
├── types/           # TypeScript 类型定义
└── index.ts         # 库入口
examples/            # API 与高级功能示例
public/              # 演示页面
test/                # Bun 测试用例
```

## 参与贡献

欢迎贡献！请阅读 `CONTRIBUTING.md` 了解项目规范、代码风格与开发流程。

## 许可证

MIT License © 项目贡献者

"项目仓库：https://github.com/jinzhongjia/screenshot"
