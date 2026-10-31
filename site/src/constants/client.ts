export const STORE_SCHEMA_VERSION = 1;

export const STORAGE_ROOT_KEYS = {
  local: 'love-page-local-store',
  session: 'love-page-session-store',
} as const;

export const STORAGE_KEYS = {
  unlocked: 'unlocked',
  passwordRateLimit: 'passwordRateLimit',
  theme: 'theme',
  wishes: 'wishes',
  visits: 'visits',
  lastVisitAt: 'lastVisitAt',
  musicState: 'musicState',
  returningVisitor: 'returningVisitor',
  visited: 'visited',
} as const;

export const APP_EVENTS = {
  pageUnlocked: 'page-unlocked',
  toast: 'app-toast',
  generateMemorialCard: 'generate-memorial-card',
} as const;
