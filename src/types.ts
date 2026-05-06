/**
 * 图标 path 数据格式定义。
 *
 * 两种紧凑形式:
 * - 单 path 且无 opacity: 直接为 SVG path 字符串。
 * - 多 path 或带 opacity: 数组形式 `[[d, opacity?], ...]`。
 */

/**
 * 单个 path 项。
 *
 * 语义形式: `[d]` 或 `[d, opacity]`;
 * 由于生成时未使用 `as const`,tsc 通常会把字面量数组推导为 `string[]`,
 * 因此联合中保留 `readonly string[]` 以兼容默认推导。
 */
export type IconPathItem =
  | readonly [d: string]
  | readonly [d: string, opacity: string]
  | readonly string[];

/** 多 path 形式。 */
export type IconPathArray = readonly IconPathItem[];

/** 图标 path 数据,字符串或数组形式。 */
export type IconPath = string | IconPathArray;
