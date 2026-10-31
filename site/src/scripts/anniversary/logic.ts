export interface AnniversaryInfo {
  gap: number;
  nth: number;
  label: string;
}

export interface AnniversaryTemplateParams {
  label: string;
  displayLabel: string;
  gap: number;
  nth: number;
}

export type AnniversaryTextMode = 'normal' | 'soon' | 'today' | 'celebrate';

export interface AnniversaryTemplateCarrier {
  easterEggTemplates?: Partial<Record<AnniversaryTextMode, string>>;
}

export interface AnniversaryI18n {
  suffix: string;
  templates: {
    normal: string;
    soon: string;
    today: string;
    celebrate: string;
  };
}

const DEFAULT_I18N: AnniversaryI18n = {
  suffix: '纪念日',
  templates: {
    normal: '✨ 距离{displayLabel}，还有 {gap} 天',
    soon: '💫 还有 {gap} 天，就是{displayLabel}啦！',
    today: '🎉 今天是{displayLabel}！🎉',
    celebrate: '{displayLabel}快乐',
  },
};

const CHINESE_SUFFIXES = ['纪念日', '生日'];
const ENGLISH_SUFFIXES = ['anniversary', 'birthday', 'day', 'date'];

function hasChineseCharacters(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function getChineseOrdinal(nth: number, label: string, suffix: string): string {
  // 标签以拉丁字母或数字开头时补一个空格，如"第 38 个 Mr YANG 生日"
  const gap = /^[A-Za-z0-9]/.test(label) ? ' ' : '';
  return `第 ${nth} 个${gap}${label}${suffix}`;
}

function getEnglishOrdinal(nth: number): string {
  const mod100 = nth % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${nth}th`;
  const mod10 = nth % 10;
  if (mod10 === 1) return `${nth}st`;
  if (mod10 === 2) return `${nth}nd`;
  if (mod10 === 3) return `${nth}rd`;
  return `${nth}th`;
}

export function getAnniversaryInfo(entryDate: string, label: string, now = new Date()): AnniversaryInfo {
  const year = now.getFullYear();
  const today = new Date(year, now.getMonth(), now.getDate());
  const [startYear, month, day] = entryDate.split('-').map(Number);
  let target = new Date(year, (month || 1) - 1, day || 1);
  if (target < today) target = new Date(year + 1, (month || 1) - 1, day || 1);
  const gap = Math.round((target.getTime() - today.getTime()) / 864e5);
  const nth = target.getFullYear() - (startYear || target.getFullYear());
  return { gap, nth, label };
}

export function formatDisplayLabel(label: string, nth: number, i18n?: AnniversaryI18n): string {
  const trimmedLabel = label.trim();
  const normalizedLabel = trimmedLabel.toLowerCase();
  const rawConfiguredSuffix = i18n?.suffix || '';
  const trimmedConfiguredSuffix = rawConfiguredSuffix.trim();
  const localeLooksChinese = trimmedConfiguredSuffix
    ? CHINESE_SUFFIXES.some((suffix) => trimmedConfiguredSuffix.includes(suffix))
    : hasChineseCharacters(trimmedLabel);
  const suffixCandidates = localeLooksChinese ? CHINESE_SUFFIXES : ENGLISH_SUFFIXES;
  const hasSuffix = suffixCandidates.some((suffix) =>
    localeLooksChinese
      ? trimmedLabel.endsWith(suffix)
      : normalizedLabel.endsWith(suffix),
  );
  const suffix = hasSuffix
    ? ''
    : (localeLooksChinese
        ? (trimmedConfiguredSuffix || DEFAULT_I18N.suffix)
        : (rawConfiguredSuffix || ' Anniversary'));

  if (localeLooksChinese) {
    return getChineseOrdinal(nth, trimmedLabel, suffix);
  }

  return `${getEnglishOrdinal(nth)} ${trimmedLabel}${suffix}`;
}

export function renderTemplate(template: string, params: AnniversaryTemplateParams): string {
  return template.replace(/\{(\w+)\}/g, (_matched, key: keyof AnniversaryTemplateParams) => {
    const value = params[key];
    return value == null ? `{${String(key)}}` : String(value);
  });
}

export function renderAnniversaryText(
  entry: AnniversaryTemplateCarrier,
  mode: AnniversaryTextMode,
  params: AnniversaryTemplateParams,
  i18n?: AnniversaryI18n,
): string {
  const templates = i18n?.templates || DEFAULT_I18N.templates;

  const customTemplate = entry.easterEggTemplates?.[mode];
  const template = typeof customTemplate === 'string' && customTemplate.trim()
    ? customTemplate
    : templates[mode];

  return renderTemplate(template, params);
}
