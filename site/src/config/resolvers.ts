import type {
  AnniversaryMark,
  Config,
  MusicConfig,
  MusicPlayMode,
  MusicStartPolicy,
  MusicTrack,
  PrivacyConfig,
  SectionKey,
  StartupImage,
  StatsMode,
  TimeMark,
} from './types';

function uniqueMarks<T extends { label: string; icon: string; date: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.icon}|${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveMotto(config: Pick<Config, 'motto' | 'quotes'>): string {
  return config.motto ?? config.quotes?.[0] ?? '';
}

export function resolveQuotes(config: Pick<Config, 'motto' | 'quotes'>): string[] {
  const normalizedQuotes = (config.quotes ?? []).map((q) => q.trim()).filter(Boolean);
  if (normalizedQuotes.length > 0) return Array.from(new Set(normalizedQuotes));
  const motto = config.motto?.trim();
  return motto ? [motto] : [];
}

function resolvePlayMode(value: unknown): MusicPlayMode {
  return value === 'single' || value === 'sequence' || value === 'shuffle' ? value : 'single';
}

function resolveStartPolicy(value: unknown): MusicStartPolicy {
  return value === 'first' || value === 'last' || value === 'random' ? value : 'first';
}

function resolveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function resolveBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function resolveTracks(tracks: unknown): MusicTrack[] {
  if (!Array.isArray(tracks)) return [];

  const seen = new Set<string>();
  const normalized: MusicTrack[] = [];

  for (const item of tracks) {
    if (!item || typeof item !== 'object') continue;

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const src = typeof item.src === 'string' ? item.src.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!id || !src || !title) continue;

    const key = `${id}|${src}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const track: MusicTrack = { id, src, title };

    const artist = typeof item.artist === 'string' ? item.artist.trim() : '';
    if (artist) track.artist = artist;

    if (Array.isArray(item.tags)) {
      const tags = item.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tags.length > 0) track.tags = Array.from(new Set(tags));
    }

    if (typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0) {
      track.weight = item.weight;
    }

    normalized.push(track);
  }

  return normalized;
}

export function resolveMusic(config: Pick<Config, 'music'>): MusicConfig {
  const music = config.music;
  return {
    enabled: resolveBool(music?.enabled, true),
    autoPlay: resolveBool(music?.autoPlay, true),
    playMode: resolvePlayMode(music?.playMode),
    allowModeSwitch: resolveBool(music?.allowModeSwitch, true),
    startPolicy: resolveStartPolicy(music?.startPolicy),
    volume: Math.min(1, Math.max(0, resolveNumber(music?.volume, 0.7))),
    rememberState: resolveBool(music?.rememberState, true),
    smartShuffleWindow: Math.max(1, Math.floor(resolveNumber(music?.smartShuffleWindow, 3))),
    tracks: resolveTracks(music?.tracks),
  };
}

function defaultAnniversaries(config: Pick<Config, 'loveDate' | 'marriageDate'>): AnniversaryMark[] {
  return [
    { label: '相恋纪念日', icon: '💕', date: config.loveDate },
    { label: '结婚纪念日', icon: '💍', date: config.marriageDate },
  ];
}

function defaultTimers(config: Pick<Config, 'loveDate' | 'marriageDate'>): TimeMark[] {
  return [
    { label: '相恋时光', icon: '💕', date: config.loveDate },
    { label: '婚姻时光', icon: '💍', date: config.marriageDate },
  ];
}

export function resolveTimers(
  config: Pick<Config, 'loveDate' | 'marriageDate' | 'timers'>,
): TimeMark[] {
  if (!config.timers?.length) {
    return uniqueMarks(defaultTimers(config));
  }

  return uniqueMarks(config.timers);
}

export function resolveAnniversaries(
  config: Pick<Config, 'loveDate' | 'marriageDate' | 'anniversaries' | 'includeDefaultAnniversaries'>,
): AnniversaryMark[] {
  const shouldIncludeDefaults = config.includeDefaultAnniversaries ?? !(config.anniversaries?.length);
  const base = shouldIncludeDefaults ? defaultAnniversaries(config) : [];
  return uniqueMarks([...base, ...(config.anniversaries ?? [])]);
}

function normalizeAssetUrl(siteUrl: string, value?: string): string | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return null;
  if (normalizedValue.startsWith('http')) return normalizedValue;
  return `${siteUrl}${normalizedValue.startsWith('/') ? '' : '/'}${normalizedValue}`;
}

export function resolveSiteImage(config: Pick<Config, 'siteUrl' | 'siteImage' | 'photos'>): string {
  const siteUrl = config.siteUrl.endsWith('/') ? config.siteUrl.slice(0, -1) : config.siteUrl;
  const imageByConfig = normalizeAssetUrl(siteUrl, config.siteImage);
  if (imageByConfig) return imageByConfig;

  if (config.photos?.length && config.photos[0].url) {
    const imageByPhoto = normalizeAssetUrl(siteUrl, config.photos[0].url);
    if (imageByPhoto) return imageByPhoto;
  }

  return `${siteUrl}/og.png`;
}

export function resolveSiteLogo(config: Pick<Config, 'siteUrl' | 'siteLogo' | 'siteImage' | 'photos'>): string {
  const siteUrl = config.siteUrl.endsWith('/') ? config.siteUrl.slice(0, -1) : config.siteUrl;
  return normalizeAssetUrl(siteUrl, config.siteLogo) ?? resolveSiteImage(config);
}

export function resolveIosStartupImages(
  config: Pick<Config, 'siteUrl' | 'iosStartupImages' | 'siteImage' | 'photos'>,
): Array<{ href: string; media?: string }> {
  const siteUrl = config.siteUrl.endsWith('/') ? config.siteUrl.slice(0, -1) : config.siteUrl;
  const rawImages = Array.isArray(config.iosStartupImages) ? config.iosStartupImages : [];
  const seen = new Set<string>();
  const images: Array<{ href: string; media?: string }> = [];

  for (const item of rawImages) {
    if (!item || typeof item !== 'object') continue;
    const startupImage = item as StartupImage;
    const href = normalizeAssetUrl(siteUrl, startupImage.src);
    if (!href) continue;

    const media = startupImage.media?.trim();
    const key = `${href}|${media || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    images.push(media ? { href, media } : { href });
  }

  if (images.length > 0) return images;
  return [{ href: resolveSiteImage(config) }];
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'todaySummary',
  'stats',
  'timers',
  'timeline',
  'anniversary',
  'wishes',
];

export function resolveSectionOrder(config: Pick<Config, 'sectionOrder'>): SectionKey[] {
  const order: SectionKey[] = [];
  for (const key of config.sectionOrder ?? []) {
    if (DEFAULT_SECTION_ORDER.includes(key) && !order.includes(key)) order.push(key);
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!order.includes(key)) order.push(key);
  }
  return order;
}

export function resolveStatsMode(config: Pick<Config, 'statsMode'>): StatsMode {
  if (config.statsMode === 'auto' || config.statsMode === 'manual' || config.statsMode === 'hybrid') {
    return config.statsMode;
  }
  return 'hybrid';
}

export function resolvePrivacySettings(
  config: Pick<Config, 'privacy'>,
): Required<Pick<PrivacyConfig, 'privateMode' | 'noIndex'>> {
  return {
    privateMode: config.privacy?.privateMode !== false,
    noIndex: config.privacy?.noIndex !== false,
  };
}
