import { APP_EVENTS, STORAGE_KEYS } from '../../constants/client.ts';

const DEFAULT_WELCOME_MESSAGE = '欢迎来到我们的专属页面 ♥';

export interface PayloadI18n {
  welcomeMessage: {
    greetingTime: {
      morning: string;
      noon: string;
      afternoon: string;
      evening: string;
      night: string;
    };
    returning: string;
  };
  easterEgg: {
    close: string;
  };
  anniversary: {
    suffix: string;
    templates: {
      normal: string;
      soon: string;
      today: string;
      celebrate: string;
    };
  };
}

export interface AppPayload {
  quotes: string[];
  secretMessage: string;
  passwordGuardEnabled: boolean;
  expectedPassword: string;
  enableWelcomeMessage: boolean;
  defaultWelcomeMessage: string;
  unlockedStorageKey: string;
  pageUnlockedEvent: string;
  i18n?: PayloadI18n;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asTrimmedString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function normalizeAppPayload(input: unknown): AppPayload {
  const source = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};

  return {
    quotes: asStringArray(source.quotes),
    secretMessage: asTrimmedString(source.secretMessage, '♥'),
    passwordGuardEnabled: source.passwordGuardEnabled === true,
    expectedPassword: asTrimmedString(source.expectedPassword),
    enableWelcomeMessage: source.enableWelcomeMessage !== false,
    defaultWelcomeMessage: asTrimmedString(source.defaultWelcomeMessage, DEFAULT_WELCOME_MESSAGE),
    unlockedStorageKey: asTrimmedString(source.unlockedStorageKey, STORAGE_KEYS.unlocked),
    pageUnlockedEvent: asTrimmedString(source.pageUnlockedEvent, APP_EVENTS.pageUnlocked),
    i18n: source.i18n && typeof source.i18n === 'object' ? {
      welcomeMessage: {
        greetingTime: {
          morning: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.greetingTime?.morning, '早上好，'),
          noon: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.greetingTime?.noon, '中午好，'),
          afternoon: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.greetingTime?.afternoon, '下午好，'),
          evening: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.greetingTime?.evening, '晚上好，'),
          night: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.greetingTime?.night, '夜深了，'),
        },
        returning: asTrimmedString((source.i18n as Record<string, unknown>).welcomeMessage?.returning, '欢迎回来，想你啦 ♥'),
      },
      easterEgg: {
        close: asTrimmedString((source.i18n as Record<string, unknown>).easterEgg?.close, '关闭'),
      },
      anniversary: {
        suffix: asTrimmedString((source.i18n as Record<string, unknown>).anniversary?.suffix, '纪念日'),
        templates: {
          normal: asTrimmedString((source.i18n as Record<string, unknown>).anniversary?.templates?.normal, '✨ 距离{displayLabel}，还有 {gap} 天'),
          soon: asTrimmedString((source.i18n as Record<string, unknown>).anniversary?.templates?.soon, '💫 还有 {gap} 天，就是{displayLabel}啦！'),
          today: asTrimmedString((source.i18n as Record<string, unknown>).anniversary?.templates?.today, '🎉 今天是{displayLabel}！🎉'),
          celebrate: asTrimmedString((source.i18n as Record<string, unknown>).anniversary?.templates?.celebrate, '{displayLabel}快乐'),
        },
      },
    } : undefined,
  };
}
