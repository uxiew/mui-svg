/**
 * mui-svg - 入口文件。
 *
 * 推荐按需导入单个图标,享受 tree-shaking:
 *   import { Abc } from 'mui-svg/Abc';
 *   import Abc from 'mui-svg/Abc';
 *
 * 也可从聚合入口导入(支持 tree-shaking 的 bundler 下也安全):
 *   import { Abc, AccessAlarmTwoTone } from 'mui-svg';
 *
 * 类型:
 *   import type { IconPath } from 'mui-svg';
 *   import type { IconPath } from 'mui-svg/types';
 */

export type { IconPath, IconPathItem, IconPathArray } from './types';
export * from './icons';
