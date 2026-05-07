/**
 * 从 mui/material-ui 仓库同步 synonyms.js 到 playground/synonyms.json.
 *
 * synonyms 是 MUI 维护的图标关键词字典 (例如: Abc -> 'alphabet character font ...'),
 * 用于支持 "搜 clip 命中 ContentCut" 这类语义搜索.
 *
 * 直接 fetch + 写入临时文件再 import 默认导出, 把对象保存为 JSON,
 * 让 playground 端无需运行时加载 .js, 也避免引入解析器.
 */

import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'playground/synonyms.json');

const SOURCE_URL =
  'https://raw.githubusercontent.com/mui/material-ui/refs/heads/master/docs/data/material/components/material-icons/synonyms.js';

async function main() {
  console.log(`[sync-synonyms] fetch <- ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const source = await res.text();

  // 写到临时 .js 文件后用 dynamic import, 让 Bun 自己处理 ES module
  const dir = await mkdtemp(join(tmpdir(), 'mui-syn-'));
  const tmpFile = join(dir, 'synonyms.js');
  await writeFile(tmpFile, source, 'utf-8');

  try {
    const mod = await import(pathToFileURL(tmpFile).href);
    const data = (mod as { default?: Record<string, string> }).default;
    if (!data || typeof data !== 'object') {
      throw new Error('synonyms 模块未提供合法的 default export');
    }

    const keys = Object.keys(data).sort();
    const sorted: Record<string, string> = {};
    for (const k of keys) {
      sorted[k] = data[k]!;
    }

    await writeFile(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    console.log(`[sync-synonyms] 写入 ${OUT}: ${keys.length} 条`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[sync-synonyms] 失败:', err);
  process.exit(1);
});
