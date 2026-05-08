/**
 * 把 playground/ 静态构建为可托管的产物 (供 GitHub Pages / 任意静态托管使用).
 *
 * Bun 1.3.x 的 `bun build <html>` 在我们的入口下会输出 0 字节 JS, 所以这里
 * 直接用 Bun.build API 单独以 app.tsx + style.css 作为 entry, 再手工把
 * index.html 中开发期的相对引用 (./style.css / ./app.tsx) 重写到带 hash 的产物名.
 *
 * 通过 PUBLIC_PATH 环境变量适配子路径部署 (例如 GitHub Pages 默认是
 * /<repo>/), 本地开发与根域部署都用 './'.
 */

import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'playground');
const OUT = join(ROOT, 'playground-dist');

// PUBLIC_PATH 必须以 '/' 结尾, 否则 hash 文件 URL 会拼错
let PUBLIC_PATH = process.env.PUBLIC_PATH ?? './';
if (!PUBLIC_PATH.endsWith('/')) PUBLIC_PATH += '/';

console.log(`[build-playground] src      = ${SRC}`);
console.log(`[build-playground] out      = ${OUT}`);
console.log(`[build-playground] base url = ${PUBLIC_PATH}`);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(SRC, 'app.tsx'), join(SRC, 'style.css')],
  outdir: OUT,
  target: 'browser',
  format: 'esm',
  minify: true,
  sourcemap: 'none',
  naming: '[name]-[hash].[ext]',
  publicPath: PUBLIC_PATH,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  throw new Error('[build-playground] bundle 失败');
}

let jsName = '';
let cssName = '';
let totalBytes = 0;
for (const o of result.outputs) {
  const name = basename(o.path);
  totalBytes += o.size;
  if (name.endsWith('.js') && o.kind === 'entry-point') jsName = name;
  else if (name.endsWith('.css')) cssName = name;
}

if (!jsName || !cssName) {
  throw new Error(
    `[build-playground] 缺少必要产物: js=${jsName || '(missing)'}, css=${cssName || '(missing)'}`,
  );
}

// 复制 index.html 并把开发期引用改为 hash 文件名
let html = await readFile(join(SRC, 'index.html'), 'utf-8');
html = html
  .replace(/href="\.\/style\.css"/g, `href="${PUBLIC_PATH}${cssName}"`)
  .replace(
    /<script\s+type="module"\s+src="\.\/app\.tsx"><\/script>/g,
    `<script type="module" src="${PUBLIC_PATH}${jsName}"></script>`,
  );

await writeFile(join(OUT, 'index.html'), html, 'utf-8');

const fmtKB = (n: number) => `${(n / 1024).toFixed(1)} KB`;
console.log(`[build-playground] 完成 (总 ${fmtKB(totalBytes)})`);
console.log(`  ${jsName}`);
console.log(`  ${cssName}`);
console.log(`  index.html`);
