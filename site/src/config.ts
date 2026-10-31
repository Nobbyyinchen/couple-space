/**
 * Love Page — 配置入口
 *
 * 说明：
 * - 类型定义位于 ./config/types.ts
 * - 默认配置位于 ./config/defaults.ts
 * - 合并与环境变量解析位于 ./config/merge.ts
 * - 业务解析函数位于 ./config/resolvers.ts
 */

import { DEFAULT_CONFIG } from './config/defaults';
import { deepMerge, parseEnvConfigPatch } from './config/merge';
import { type Config } from './config/types';
import { encryptPassword, isEncryptedPassword } from './passwordCipher';
import { loadState, publicState } from '../../scripts/store.mjs';

export type {
  AnniversaryEasterEggTemplates,
  AnniversaryMark,
  Config,
  ConfigPatch,
  Milestone,
  MusicConfig,
  MusicPlayMode,
  MusicStartPolicy,
  MusicTrack,
  PasswordBruteForceProtectionConfig,
  PasswordConfig,
  PrivacyConfig,
  Photo,
  SectionKey,
  StartupImage,
  StatItem,
  StatsMode,
  TimeMark,
  WishItem,
} from './config/types';

export {
  resolveAnniversaries,
  resolveIosStartupImages,
  resolveMotto,
  resolveMusic,
  resolvePrivacySettings,
  resolveQuotes,
  resolveSectionOrder,
  resolveSiteImage,
  resolveSiteLogo,
  resolveStatsMode,
  resolveTimers,
} from './config/resolvers';

function protectPassword(password: string): string {
  if (!password) return '';
  if (isEncryptedPassword(password)) return password;
  return encryptPassword(password);
}

const ENV_CONFIG_PATCH = parseEnvConfigPatch(import.meta.env.VITE_LOVE_CONFIG_JSON);
const RAW_CONFIG: Config = deepMerge(DEFAULT_CONFIG, ENV_CONFIG_PATCH);

if (RAW_CONFIG.passwordConfig?.enabled && RAW_CONFIG.passwordConfig.password) {
  RAW_CONFIG.passwordConfig.password = protectPassword(RAW_CONFIG.passwordConfig.password);
}

export const CONFIG: Config = RAW_CONFIG;
export const UNIVERSE = publicState(loadState());
