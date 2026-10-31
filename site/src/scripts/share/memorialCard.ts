import {
  formatDisplayLabel,
  getAnniversaryInfo,
  renderAnniversaryText,
  type AnniversaryI18n,
  type AnniversaryTemplateCarrier,
  type AnniversaryTextMode,
} from '../anniversary/logic.ts';

export interface MemorialAnniversary extends AnniversaryTemplateCarrier {
  label: string;
  date: string;
  icon?: string;
}

export interface MemorialCardContext {
  index: number;
  anniversary: MemorialAnniversary;
  gap: number;
  nth: number;
  mode: AnniversaryTextMode;
  displayLabel: string;
  message: string;
}

export interface ResolveMemorialCardContextInput {
  anniversaries: MemorialAnniversary[];
  selectedIndex?: number | null;
  countdownThreshold?: number;
  anniversaryI18n?: AnniversaryI18n;
  now?: Date;
}

interface RankedAnniversary {
  index: number;
  anniversary: MemorialAnniversary;
  gap: number;
  nth: number;
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function isValidAnniversary(entry: unknown): entry is MemorialAnniversary {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Record<string, unknown>;
  return typeof candidate.label === 'string' && candidate.label.trim().length > 0
    && typeof candidate.date === 'string'
    && candidate.date.trim().length > 0;
}

function resolveMode(gap: number, countdownThreshold: number): AnniversaryTextMode {
  if (gap === 0) return 'today';
  if (countdownThreshold > 0 && gap <= countdownThreshold) return 'soon';
  return 'normal';
}

function pickNearest(items: RankedAnniversary[]): RankedAnniversary | undefined {
  return [...items].sort((a, b) => {
    if (a.gap !== b.gap) return a.gap - b.gap;
    return a.index - b.index;
  })[0];
}

export function resolveMemorialCardContext(input: ResolveMemorialCardContextInput): MemorialCardContext | null {
  const now = input.now ?? new Date();
  const countdownThreshold = Number.isFinite(input.countdownThreshold) ? Number(input.countdownThreshold) : 10;

  const ranked = (input.anniversaries ?? [])
    .map((anniversary, index) => ({ anniversary, index }))
    .filter((item): item is { anniversary: MemorialAnniversary; index: number } => isValidAnniversary(item.anniversary))
    .map(({ anniversary, index }) => {
      const info = getAnniversaryInfo(anniversary.date, anniversary.label, now);
      return {
        index,
        anniversary,
        gap: info.gap,
        nth: info.nth,
      };
    });

  if (!ranked.length) return null;

  const requested = isFiniteInteger(input.selectedIndex)
    ? ranked.find((item) => item.index === input.selectedIndex)
    : undefined;

  const target = requested ?? pickNearest(ranked);
  if (!target) return null;

  const displayLabel = formatDisplayLabel(target.anniversary.label, target.nth, input.anniversaryI18n);
  const mode = resolveMode(target.gap, countdownThreshold);
  const message = renderAnniversaryText(target.anniversary, mode, {
    label: target.anniversary.label,
    displayLabel,
    gap: target.gap,
    nth: target.nth,
  }, input.anniversaryI18n);

  return {
    index: target.index,
    anniversary: target.anniversary,
    gap: target.gap,
    nth: target.nth,
    mode,
    displayLabel,
    message,
  };
}
