# 使用官方 Bun 镜像作为基础
FROM oven/bun:1.3 AS base

# 安装 Chromium 和 Puppeteer 所需的依赖
RUN apt-get update && apt-get install -y \
    chromium \
    wget \
    ca-certificates \
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json bun.lockb* ./

# 安装依赖
RUN bun install --frozen-lockfile --production

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 创建非 root 用户运行服务（安全最佳实践）
RUN groupadd -r screenshot && useradd -r -g screenshot -G audio,video screenshot \
    && mkdir -p /home/screenshot/Downloads \
    && chown -R screenshot:screenshot /home/screenshot \
    && chown -R screenshot:screenshot /app

# 切换到非 root 用户
USER screenshot

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 运行服务
CMD ["bun", "run", "demo"]