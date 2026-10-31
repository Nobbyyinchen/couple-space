import type { PasswordConfig } from './config';

const DEFAULT_WELCOME_MESSAGE = '欢迎来到我们的专属页面 ♥';

export function hasPasswordGuard(config?: PasswordConfig): boolean {
  if (!config?.enabled) return false;
  return typeof config.password === 'string' && config.password.trim().length > 0;
}

export function shouldLockPage(options: {
  hasGuardElement: boolean;
  passwordConfig?: PasswordConfig;
  storedUnlockValue: string | null;
}): boolean {
  const { hasGuardElement, passwordConfig, storedUnlockValue } = options;
  if (!hasGuardElement || !hasPasswordGuard(passwordConfig)) return false;

  const expectedPassword = passwordConfig?.password?.trim() || '';
  if (!expectedPassword) return false;

  return storedUnlockValue !== expectedPassword;
}

export function resolveUnlockToastMessage(
  successMessage?: string,
  welcomeMessage?: string,
): string {
  const success = successMessage?.trim();
  if (success) return success;
  const welcome = welcomeMessage?.trim();
  return welcome || DEFAULT_WELCOME_MESSAGE;
}
