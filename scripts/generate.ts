/**
 * 生成器: 从 @mui/icons-material 抽取 SVG path 数据,
 * 输出为 src/icons/<IconName>.ts。
 *
 * 输出格式:
 *   - 单 path 且无 opacity: export const Name = 'M...';
 *   - 多 path 或带 opacity: export const Name = [['M...', '.3'], ['m...']];
 */

import { readdir, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE_DIR = join(ROOT, 'node_modules/@mui/icons-material');
const OUTPUT_DIR = join(ROOT, 'src/icons');

interface IconPathItem {
  d: string;
  opacity?: string;
}

interface ParsedIcon {
  name: string;
  paths: IconPathItem[];
}

/** 数字格式化: 去掉无意义的 0 前缀(如 0.5 -> .5),与 MUI 习惯一致. */
function fmt(n: number): string {
  // 保留至多 4 位小数,去除尾随 0
  let s = (Math.round(n * 10000) / 10000).toString();
  // -0.5 -> -.5; 0.5 -> .5
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = '-' + s.slice(2);
  return s;
}

/** 将 <circle cx cy r> 等价转换为单条 SVG path d 字符串. */
function circleToPath(cx: number, cy: number, r: number): string {
  // M(cx-r,cy) a r,r 0 1,0 2r,0 a r,r 0 1,0 -2r,0
  return `M${fmt(cx - r)} ${fmt(cy)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0`;
}

/** 从图标源码中抽取所有 path / circle 元素的几何数据. */
function extractPaths(name: string, content: string): IconPathItem[] {
  const items: IconPathItem[] = [];
  // 同时匹配 path 与 circle 元素
  const segmentRegex = /\("(path|circle)",\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = segmentRegex.exec(content)) !== null) {
    const tag = match[1]!;
    const segment = match[2]!;
    const opacityMatch = /opacity:\s*"([^"]+)"/.exec(segment);
    const opacity = opacityMatch?.[1];

    if (tag === 'path') {
      const dMatch = /d:\s*"([^"]+)"/.exec(segment);
      if (!dMatch) continue;
      items.push({ d: dMatch[1]!, opacity });
    } else {
      // circle: 提取 cx cy r 并转 path
      const cxMatch = /cx:\s*"([^"]+)"/.exec(segment);
      const cyMatch = /cy:\s*"([^"]+)"/.exec(segment);
      const rMatch = /r:\s*"([^"]+)"/.exec(segment);
      if (!cxMatch || !cyMatch || !rMatch) continue;
      const cx = Number(cxMatch[1]);
      const cy = Number(cyMatch[1]);
      const r = Number(rMatch[1]);
      if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r)) continue;
      items.push({ d: circleToPath(cx, cy, r), opacity });
    }
  }
  return items;
}

/** 生成单个图标对应的 TS 源码. */
function toSource(icon: ParsedIcon): string {
  const { name, paths } = icon;
  if (paths.length === 0) {
    throw new Error(`图标 ${name} 没有可识别的 path/circle 元素`);
  }
  let valueLiteral: string;
  // 单 path 且无 opacity: 直接字符串
  if (paths.length === 1 && !paths[0]!.opacity) {
    valueLiteral = `'${paths[0]!.d}'`;
  } else {
    // 多 path 或带 opacity: 数组形式 [d, opacity?][]
    const items = paths.map((p) => {
      if (p.opacity) {
        return `  ['${p.d}', '${p.opacity}'],`;
      }
      return `  ['${p.d}'],`;
    });
    valueLiteral = `[\n${items.join('\n')}\n]`;
  }
  // 直接 default 导出, 文件最简形态:
  //   export default 'M...';
  //   export default [['M...', '.3'], ...];
  // 子路径只支持 default 导入: import Abc from 'mui-svg/Abc';
  // 聚合命名导入由 icons/index.ts 通过 `export { default as X }` 提供:
  //   import { Abc } from 'mui-svg';
  return `export default ${valueLiteral};\n`;
}

/** 按照固定批大小并发处理任务,避免 fd 耗尽. */
async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    await Promise.all(slice.map(worker));
  }
}

async function main() {
  console.log(`[generate] source = ${SOURCE_DIR}`);
  console.log(`[generate] output = ${OUTPUT_DIR}`);

  // 清理旧产物
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const all = await readdir(SOURCE_DIR);
  // 过滤出图标主源文件 (大写字母开头的 .js)
  const iconFiles = all.filter((f) => /^[A-Z][A-Za-z0-9]*\.js$/.test(f));
  console.log(`[generate] 待处理图标文件: ${iconFiles.length}`);

  const exportNames: string[] = [];
  let single = 0;
  let multi = 0;
  let twoTone = 0;

  await runInBatches(iconFiles, 200, async (fileName) => {
    const name = fileName.slice(0, -3); // 去掉 .js
    const content = await readFile(join(SOURCE_DIR, fileName), 'utf-8');
    const paths = extractPaths(name, content);
    if (paths.length === 0) {
      // 立即中断, 让 CI 暴露问题
      throw new Error(`[generate] 解析失败 (无 path/circle): ${fileName}`);
    }
    if (paths.length === 1 && !paths[0]!.opacity) {
      single += 1;
    } else {
      multi += 1;
      if (paths.some((p) => p.opacity)) twoTone += 1;
    }
    const code = toSource({ name, paths });
    await writeFile(join(OUTPUT_DIR, `${name}.ts`), code, 'utf-8');
    exportNames.push(name);
  });

  exportNames.sort();

  // 生成 icons/index.ts: 通过 default 重命名为 named, 既保留 tree-shaking
  // 又让聚合入口 `import { Abc } from 'mui-svg'` 可用,
  // 同时不暴露任何 named export 在子路径上.
  const indexLines = exportNames.map(
    (n) => `export { default as ${n} } from './${n}';`,
  );
  await writeFile(
    join(OUTPUT_DIR, 'index.ts'),
    `// 自动生成,请勿手动修改\n${indexLines.join('\n')}\n`,
    'utf-8',
  );

  console.log(
    `[generate] 完成: 共 ${exportNames.length} 个图标 (单 path: ${single}, 多 path: ${multi}, TwoTone: ${twoTone})`,
  );
}

main().catch((err) => {
  console.error('[generate] 发生错误:', err);
  process.exit(1);
});
