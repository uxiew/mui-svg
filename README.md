# mui-svg

[![npm version](https://img.shields.io/npm/v/mui-svg.svg)](https://www.npmjs.com/package/mui-svg)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

The **pure data version** of [`@mui/icons-material`](https://www.npmjs.com/package/@mui/icons-material): It exports the SVG `path` data of over 10,000 Material Design icons as JS/TS constants, which can be used in all framework applications. It features controllable package size, tree-shakability, and runtime-free usability.

[`@mui/icons-material`](https://www.npmjs.com/package/@mui/icons-material) 的 **纯数据版**：把 10000+ 个 Material Design 图标的 SVG `path` 数据导出为 JS/TS 常量,所有框架应用都可以使用，体积可控、可摇树、可无运行时使用。

## 为什么需要它

`@mui/icons-material` 把每个图标都打包成一个完整的 React 组件。如果你只需要 SVG `path` 数据(自己渲染、用在 Vue/Solid/Svelte/小程序、生成图片、做画布、做图标导出工具…)，那么引入完整 React 组件库代价过大。

`mui-svg` 把每一个图标提取为最简单的 `string`(单 path)或 `[d, opacity?][]`(多 path / TwoTone)，其余什么都不做。

## 安装

```bash
# bun
npm i mui-svg

# bun / pnpm / yarn
bun add mui-svg
pnpm add mui-svg
yarn add mui-svg
```

## 数据格式

```ts
// types.ts
type IconPathItem =
  | readonly [d: string]
  | readonly [d: string, opacity: string]
  | readonly string[];

type IconPath = string | readonly IconPathItem[];
```

- **单 path 且无 opacity** —— 直接为字符串：

  ```ts
  export const Abc = 'M21 11h-1.5v-.5h-2v3...';
  ```

- **多 path 或带 opacity (TwoTone)** —— 数组形式：

  ```ts
  export const AccessAlarmTwoTone = [
    ['M12 6c-3.87 0-7 3.13-7 7s...', '.3'],
    ['M12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9...'],
  ];
  ```

> SVG 中的 `<circle cx cy r>` 元素会在生成时被等价转换为单条 `path d`，因此所有图标的数据形态都是统一的 `path`。

## 两种导入方式

每个图标只暴露 **默认导出**,聚合入口同时提供命名导出:

```ts
// 1. 默认导入 (子路径,推荐 — 体积最小)
import Home from 'mui-svg/Home';

// 2. 聚合命名导入 (顶层入口,支持 tree-shaking)
import { Home, AccessAlarmTwoTone, BubbleChart } from 'mui-svg';
```

> ✅ 两种方式都享受 tree-shaking。`sideEffects: false` 已在 `package.json` 中声明,未使用的图标不会被打入产物。
>
> 子路径不提供命名导出 (`import { Home } from 'mui-svg/Home'` 不可用),
> 这一限制让单文件结构更紧凑,也避免与默认导出语义重复。

## 类型导入

```ts
import type { IconPath, IconPathItem, IconPathArray } from 'mui-svg';
// 或
import type { IconPath } from 'mui-svg/types';
```

## 使用示例

### React

```tsx
import type { IconPath } from 'mui-svg';
import Home from 'mui-svg/Home';
import HomeTwoTone from 'mui-svg/HomeTwoTone';

interface IconProps {
  data: IconPath;
  size?: number;
  color?: string;
}

export function Icon({ data, size = 24, color = 'currentColor' }: IconProps) {
  const items = typeof data === 'string'
    ? [{ d: data }]
    : data.map(([d, opacity]) => ({ d, opacity }));

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {items.map((p, i) => (
        <path key={i} d={p.d} opacity={p.opacity} />
      ))}
    </svg>
  );
}

// <Icon data={Home} />
// <Icon data={HomeTwoTone} color="#6aa9ff" />
```

### Vue 3

```vue
<script setup lang="ts">
import type { IconPath } from 'mui-svg';
import Search from 'mui-svg/Search';

defineProps<{ data?: IconPath }>();
const data = Search;
const items = typeof data === 'string'
  ? [{ d: data }]
  : data.map(([d, opacity]) => ({ d, opacity }));
</script>

<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path v-for="(p, i) in items" :key="i" :d="p.d" :opacity="p.opacity" />
  </svg>
</template>
```

### 纯 DOM (无框架)

```ts
import Search from 'mui-svg/Search';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('width', '24');
svg.setAttribute('height', '24');
svg.setAttribute('fill', 'currentColor');

const items = typeof Search === 'string'
  ? [{ d: Search }]
  : Search.map(([d, o]) => ({ d, opacity: o }));

items.forEach(({ d, opacity }) => {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  if (opacity) path.setAttribute('opacity', opacity);
  svg.appendChild(path);
});

document.body.appendChild(svg);
```

## 命名规则

与 `@mui/icons-material` 保持一致，分五种风格：

| 风格 | 后缀 | 示例 |
| --- | --- | --- |
| Filled (默认) | _无_ | `Home` |
| Outlined | `Outlined` | `HomeOutlined` |
| Rounded | `Rounded` | `HomeRounded` |
| Sharp | `Sharp` | `HomeSharp` |
| Two Tone | `TwoTone` | `HomeTwoTone` |

## Playground

仓库内自带可视化 playground,可搜索全部 10750 个图标(参考 [MUI 官方 icons 搜索](https://mui.com/material-ui/material-icons/) 的体验):

> 在线预览: **https://uxiew.github.io/mui-svg/** (由下方 GitHub Action 自动部署)

本地启动:

```bash
bun install
bun run playground          # 开发模式: http://localhost:3000
bun run playground:build    # 静态构建到 ./playground-dist
```

效果:
- 顶部搜索框 + 五种风格 tab 切换 (Filled / Outlined / Rounded / Sharp / TwoTone)
- 同义词全文搜索 (FlexSearch + MUI synonyms): 搜 `clip` 命中 ContentPaste、搜 `test` 命中 BugReport
- 明暗主题切换,跟随 `prefers-color-scheme` 并 localStorage 持久化
- 卡片网格全量展示,匹配数 + 当前展示数实时反馈
- IntersectionObserver 分页加载 (每次 +200 个),支持万级数据流畅滚动
- 选中后右侧展示数据、两种导入示例、渲染代码

### 部署到 GitHub Pages

仓库内置 `.github/workflows/deploy-playground.yml`,在以下时机自动部署 playground 到 GitHub Pages:

- `main` 分支上 `playground/`、`src/icons/` 或构建脚本变更后 push
- 上游同步工作流 (`Sync upstream & release`) 完成后 (新图标自动可视化)
- 手动 `workflow_dispatch` 触发

**首次启用步骤:**

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 `GitHub Actions`
2. 确认 **Settings → Actions → General → Workflow permissions** 至少 `Read and write`
3. 触发一次 `Deploy playground to Pages` workflow,等待绿色后访问站点 URL

## 自动同步上游

仓库通过 GitHub Actions 实现 **每两天凌晨自动检测 `@mui/icons-material` 的最新版本**：

1. 读取 npm registry 上 `@mui/icons-material` 的 `latest` 版本；
2. 与本仓库 `package.json` 中已记录的上游版本对比；
3. 若上游有更新：
   - 升级 `devDependencies`；
   - 重新执行 `bun run generate` + `bun run build`；
   - **跟随上游 semver 凸点类型** 升级本包版本(patch → patch、minor → minor、major → major)；
   - 提交 commit、打 tag、发布到 npm(需配置 `NPM_TOKEN` secret)。

## 本地构建

```bash
bun install              # 安装依赖
bun run generate         # 仅生成 src/icons/*.ts (10750 个文件)
bun run build            # 清理 + 生成 + tsc 编译为 dist
bun run playground       # 启动开发模式 playground
bun run playground:build # 静态构建 playground 到 ./playground-dist
```

## 目录结构

```
.
├── scripts/
│   ├── generate.ts          # 解析 @mui/icons-material 并生成 src/icons/*.ts
│   ├── sync-synonyms.ts     # 从 mui repo 同步图标同义词字典
│   ├── sync-upstream.ts     # 检测上游版本并按凸点类型升级本包
│   └── build-playground.ts  # 把 playground 静态打包为 playground-dist/
├── src/
│   ├── icons/               # 自动生成,共 10750+ 个图标
│   ├── types.ts             # IconPath 类型定义
│   └── index.ts             # 顶层入口
├── playground/              # 可视化示例 (Bun.serve + React)
├── .github/workflows/
│   ├── sync-upstream.yml    # 每两天检测上游, 自动 build & publish
│   └── deploy-playground.yml# 自动构建 playground 并部署到 GitHub Pages
├── dist/                    # tsc 构建产物 (.js + .d.ts)
├── playground-dist/         # 静态 playground 产物 (gitignored)
├── tsconfig.json            # 默认 (开发/Lint)
├── tsconfig.build.json      # 构建专用
└── package.json
```

## 协议

[MIT](./LICENSE) © ver5

> 图标素材源自 [Google Material Icons](https://fonts.google.com/icons)(Apache 2.0),通过 [`@mui/icons-material`](https://github.com/mui/material-ui/tree/master/packages/mui-icons-material) 提取。本项目仅做数据搬运。
