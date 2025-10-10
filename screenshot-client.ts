#!/usr/bin/env bun

/**
 * 向后兼容的命令行工具
 * 请使用新的 CLI: bun run cli
 */

console.log('⚠️  此命令已废弃，请使用新的 CLI 工具：');
console.log('   bun run cli <url> [options]');
console.log('   或直接运行: bun ./src/cli/index.ts <url> [options]');
console.log();
console.log('继续使用旧版 API 模式...');
console.log();

// 导入并运行新的 CLI
import('./src/cli/index.ts');
