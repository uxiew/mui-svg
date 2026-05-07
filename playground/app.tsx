import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Index as FlexSearchIndex } from 'flexsearch';
import * as AllIcons from '../src/icons';
import LightMode from '../src/icons/LightMode';
import DarkMode from '../src/icons/DarkMode';
import type { IconPath } from '../src/types';
import synonyms from './synonyms.json';

type Family = 'Filled' | 'Outlined' | 'Rounded' | 'Sharp' | 'TwoTone';

interface IconItem {
  name: string;
  data: IconPath;
  family: Family;
  /** 去掉 family 后缀的基名,用于和 MUI synonyms 对齐 */
  baseName: string;
}

const FAMILIES: Family[] = ['Filled', 'Outlined', 'Rounded', 'Sharp', 'TwoTone'];

function detectFamily(name: string): { family: Family; baseName: string } {
  for (const suffix of ['Outlined', 'Rounded', 'Sharp', 'TwoTone'] as const) {
    if (name.endsWith(suffix)) {
      return { family: suffix, baseName: name.slice(0, -suffix.length) };
    }
  }
  return { family: 'Filled', baseName: name };
}

const SYN = synonyms as Record<string, string>;

// 启动时一次性构建索引
const ALL_ICONS: IconItem[] = [];
const ICONS_BY_NAME = new Map<string, IconItem>();
for (const [name, data] of Object.entries(AllIcons as Record<string, IconPath>)) {
  const { family, baseName } = detectFamily(name);
  const item: IconItem = { name, data, family, baseName };
  ALL_ICONS.push(item);
  ICONS_BY_NAME.set(name, item);
}
ALL_ICONS.sort((a, b) => a.name.localeCompare(b.name));

// FlexSearch 全文索引: name + synonyms (覆盖 5 种风格的同一基名)
// tokenize: 'full' 让任意子串都能命中, 与 MUI 官方 SearchIcons 一致.
const searchIndex = new FlexSearchIndex({ tokenize: 'full' });
for (const item of ALL_ICONS) {
  let searchable = item.name;
  const syn = SYN[item.baseName];
  if (syn) searchable += ' ' + syn;
  searchIndex.add(item.name, searchable);
}
console.log(
  `[playground] 索引就绪: ${ALL_ICONS.length} 个图标, synonyms ${Object.keys(SYN).length} 条`,
);

const PAGE_SIZE = 200;

interface IconProps {
  data: IconPath;
  size?: number;
  color?: string;
}

function Icon({ data, size = 24, color = 'currentColor' }: IconProps) {
  const items: Array<{ d: string; opacity?: string }> =
    typeof data === 'string'
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

function formatData(data: IconPath): string {
  if (typeof data === 'string') return `'${data}'`;
  const lines = data.map((p) => {
    if (p.length === 2) return `  ['${p[0]}', '${p[1]}'],`;
    return `  ['${p[0]}'],`;
  });
  return `[\n${lines.join('\n')}\n]`;
}

type Theme = 'light' | 'dark';

const THEME_KEY = 'mui-svg-playground-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [filter, setFilter] = useState('');
  const [familyFilter, setFamilyFilter] = useState<Family | 'All'>('All');
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<IconItem>(ALL_ICONS[0]!);

  // 同步 theme 到 documentElement, 让 CSS 变量切换 + 持久化
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const filtered = useMemo(() => {
    const q = filter.trim();
    let pool: IconItem[];

    if (q === '') {
      pool = ALL_ICONS;
    } else {
      // FlexSearch 返回的 id 列表 (Id 来自 add() 时的第一参, 即图标名).
      // 上限给得足够大, 避免 family 过滤后剩余太少.
      const ids = searchIndex.search(q, { limit: 10000 }) as Array<string | number>;
      pool = [];
      for (const id of ids) {
        const item = ICONS_BY_NAME.get(String(id));
        if (item) pool.push(item);
      }
    }

    if (familyFilter !== 'All') {
      pool = pool.filter((s) => s.family === familyFilter);
    }
    return pool;
  }, [filter, familyFilter]);

  // 过滤条件变更时重置分页
  useEffect(() => {
    setShownCount(PAGE_SIZE);
  }, [filter, familyFilter]);

  // 滚动到底部自动加载下一页
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShownCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length, shownCount]);

  const visible = filtered.slice(0, shownCount);
  const synonymHint = SYN[selected.baseName];

  return (
    <div className="app">
      <header className="header">
        <div className="header-text">
          <h1>mui-svg Playground</h1>
          <p className="subtitle">
            {ALL_ICONS.length.toLocaleString()} 个 Material 图标 · 全文同义词搜索 (FlexSearch +
            MUI synonyms)
          </p>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          aria-label="切换主题"
        >
          <Icon data={theme === 'dark' ? LightMode : DarkMode} size={20} />
        </button>
      </header>

      <section className="toolbar">
        <input
          className="search"
          type="text"
          placeholder="按名称或同义词搜索 (clip / test / arrow / clock…)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoFocus
        />
        <div className="tabs">
          {(['All', ...FAMILIES] as const).map((f) => (
            <button
              key={f}
              className={`tab ${familyFilter === f ? 'active' : ''}`}
              onClick={() => setFamilyFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <div className="status">
        匹配 <strong>{filtered.length.toLocaleString()}</strong> 个 · 当前展示{' '}
        <strong>{visible.length.toLocaleString()}</strong>
        {shownCount < filtered.length && (
          <span className="hint"> (滚动到底部自动加载更多)</span>
        )}
      </div>

      <main className="main">
        <section className="grid-wrap">
          <div className="grid">
            {visible.length === 0 && <div className="empty">没有匹配的图标</div>}
            {visible.map((s) => (
              <button
                key={s.name}
                className={`card ${selected.name === s.name ? 'selected' : ''}`}
                onClick={() => setSelected(s)}
                title={s.name}
              >
                <Icon data={s.data} size={32} />
                <span className="name">{s.name}</span>
              </button>
            ))}
          </div>
          {shownCount < filtered.length && (
            <div ref={sentinelRef} className="sentinel">
              加载更多…
            </div>
          )}
        </section>

        <aside className="detail">
          <div className="preview">
            <Icon data={selected.data} size={120} />
          </div>
          <h2>{selected.name}</h2>
          <span className="family">{selected.family}</span>
          {synonymHint && (
            <p className="synonym">
              <span className="synonym-label">同义词:</span> {synonymHint}
            </p>
          )}

          <h3>导入方式</h3>
          <pre className="code">{`// 1. 默认导入 (子路径)
import ${selected.name} from 'mui-svg/${selected.name}';

// 2. 命名导入 (顶层聚合, 支持 tree-shaking)
import { ${selected.name} } from 'mui-svg';`}</pre>

          <h3>数据</h3>
          <pre className="code data">{formatData(selected.data)}</pre>

          <h3>渲染示例</h3>
          <pre className="code">{`function Icon({ data }) {
  const paths = typeof data === 'string'
    ? [{ d: data }]
    : data.map(([d, opacity]) => ({ d, opacity }));
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      {paths.map((p, i) => (
        <path key={i} d={p.d} opacity={p.opacity} />
      ))}
    </svg>
  );
}`}</pre>
        </aside>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
