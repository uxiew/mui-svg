/**
 * Playground 入口: 用 Bun.serve + HTML imports 运行一个最小可视化页面,
 * 展示 mui-svg 三种导入方式与图标渲染.
 */

import index from './index.html';

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  routes: {
    '/': index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🎨 mui-svg playground: http://localhost:${server.port}`);
