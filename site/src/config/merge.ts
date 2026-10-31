import fs from 'node:fs';
import path from 'node:path';

import type { ConfigPatch } from './types';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;

  if (Array.isArray(base)) {
    return Array.isArray(patch) ? (patch as T) : base;
  }

  if (!isPlainObject(base)) {
    return patch as T;
  }

  if (!isPlainObject(patch)) {
    return base;
  }

  const baseRecord = base as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...baseRecord };

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined || patchValue === null) continue;
    const baseValue = baseRecord[key];
    if (Array.isArray(patchValue)) {
      merged[key] = patchValue;
      continue;
    }
    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      merged[key] = deepMerge(baseValue, patchValue);
      continue;
    }
    merged[key] = patchValue;
  }

  return merged as T;
}

export function parseEnvConfigPatch(raw: string | undefined): ConfigPatch {
  if (!raw?.trim()) return {};

  let jsonContent = raw.trim();

  if (!jsonContent.startsWith('{')) {
    try {
      const resolvedPath = path.isAbsolute(jsonContent)
        ? jsonContent
        : path.resolve(process.cwd(), jsonContent);

      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        jsonContent = fs.readFileSync(resolvedPath, 'utf-8');
      }
    } catch (error) {
      console.error(`[CONFIG] Error reading config file at "${jsonContent}":`, error);
    }
  }

  try {
    const parsed = JSON.parse(jsonContent) as unknown;
    if (!isPlainObject(parsed)) {
      throw new Error('must be a JSON object');
    }
    return parsed as ConfigPatch;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`[CONFIG] Failed to parse VITE_LOVE_CONFIG_JSON: ${reason}`);
  }
}
