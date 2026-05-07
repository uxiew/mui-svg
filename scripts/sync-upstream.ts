/**
 * 同步 @mui/icons-material 到当前包:
 *   1. 读 npm registry 上 latest 版本
 *   2. 与 package.json.muiIconsMaterialVersion 比对
 *   3. 若有更新, 跟随上游 semver 凸点类型升级本包版本号
 *      (patch -> patch / minor -> minor / major -> major)
 *   4. 通过 GITHUB_OUTPUT 把变更结果写出, 供后续步骤使用
 *
 * 注意: 此脚本只更新 package.json (字段 version、devDependencies、muiIconsMaterialVersion).
 * 真正的 install / generate / build / publish 由 workflow 控制.
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PKG_PATH = join(ROOT, 'package.json');

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  pre?: string;
}

function parseSemver(v: string): SemVer {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(v.trim());
  if (!m) throw new Error(`非法 semver: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function fmtSemver(s: SemVer): string {
  return `${s.major}.${s.minor}.${s.patch}`;
}

type BumpKind = 'major' | 'minor' | 'patch' | 'none';

/** 比较上游版本变化的凸点类型 */
function diffBump(prev: SemVer, next: SemVer): BumpKind {
  if (next.major > prev.major) return 'major';
  if (next.major < prev.major) return 'none'; // 不允许降级
  if (next.minor > prev.minor) return 'minor';
  if (next.minor < prev.minor) return 'none';
  if (next.patch > prev.patch) return 'patch';
  return 'none';
}

function applyBump(current: SemVer, kind: BumpKind): SemVer {
  switch (kind) {
    case 'major':
      return { major: current.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case 'patch':
      return { major: current.major, minor: current.minor, patch: current.patch + 1 };
    case 'none':
      return current;
  }
}

async function fetchLatestUpstream(): Promise<string> {
  const res = await fetch('https://registry.npmjs.org/@mui/icons-material/latest');
  if (!res.ok) {
    throw new Error(`查询 npm registry 失败: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { version?: string };
  if (!data.version) throw new Error('npm registry 返回缺少 version 字段');
  return data.version;
}

async function writeOutput(key: string, value: string) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    console.log(`[sync] (本地) ${key}=${value}`);
    return;
  }
  // GitHub Actions 多行/特殊字符规范: key<<EOF\nvalue\nEOF
  await appendFile(file, `${key}=${value}\n`);
}

async function main() {
  const upstreamLatest = await fetchLatestUpstream();
  console.log(`[sync] 上游最新版本: ${upstreamLatest}`);

  const pkgRaw = await readFile(PKG_PATH, 'utf-8');
  const pkg = JSON.parse(pkgRaw) as Record<string, unknown> & {
    version: string;
    muiIconsMaterialVersion?: string;
    devDependencies?: Record<string, string>;
  };

  const recordedUpstream = pkg.muiIconsMaterialVersion ?? '0.0.0';
  console.log(`[sync] 当前记录的上游版本: ${recordedUpstream}`);
  console.log(`[sync] 本包当前版本: ${pkg.version}`);

  const prevUp = parseSemver(recordedUpstream);
  const nextUp = parseSemver(upstreamLatest);
  const bump = diffBump(prevUp, nextUp);

  await writeOutput('upstream_version', upstreamLatest);
  await writeOutput('previous_upstream_version', recordedUpstream);
  await writeOutput('bump_kind', bump);

  if (bump === 'none') {
    console.log('[sync] 上游无更新 (或为降级), 跳过.');
    await writeOutput('changed', 'false');
    return;
  }

  const currentSelf = parseSemver(pkg.version);
  const nextSelf = applyBump(currentSelf, bump);
  const nextSelfStr = fmtSemver(nextSelf);
  console.log(`[sync] 凸点类型: ${bump}, 新版本号: ${nextSelfStr}`);

  pkg.version = nextSelfStr;
  pkg.muiIconsMaterialVersion = upstreamLatest;
  if (pkg.devDependencies) {
    pkg.devDependencies['@mui/icons-material'] = `^${upstreamLatest}`;
  }

  // 保留尾随换行, 减少 diff 噪声
  await writeFile(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  await writeOutput('changed', 'true');
  await writeOutput('next_version', nextSelfStr);
  console.log('[sync] package.json 已更新.');
}

main().catch((err) => {
  console.error('[sync] 失败:', err);
  process.exit(1);
});
