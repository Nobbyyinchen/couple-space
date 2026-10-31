/// <reference path="../.astro/types.d.ts" />

interface LoveStoreApi {
  schemaVersion: number;
  localRootKey: string;
  sessionRootKey: string;
  getLocal(key: string): unknown;
  setLocal(key: string, value: unknown): void;
  removeLocal(key: string): void;
  getSession(key: string): unknown;
  setSession(key: string, value: unknown): void;
  removeSession(key: string): void;
}

interface Window {
  __LOVE_STORE__?: LoveStoreApi;
}
