/**
 * Love Page — i18n Utilities
 */

import { DEFAULT_LOCALE, isValidLocale, type LocaleCode } from './locales';
import { MESSAGES_ZH_CN } from './messages/zh-CN';
import { MESSAGES_EN_US } from './messages/en-US';

export interface LocaleMessages {
  sections: {
    todaySummary: string;
    timers: string;
    timeline: string;
    anniversary: string;
    wishes: string;
    stats: string;
  };
  actions: {
    generateCard: string;
    openPhotoWall: string;
    toggleTheme: string;
    playMusic: string;
    pauseMusic: string;
    nextTrack: string;
    prevTrack: string;
    share: string;
    backToTop: string;
    close: string;
  };
  footer: {
    madeWithLove: string;
    viewOnGithub: string;
  };
  loader: {
    loading: string;
  };
  password: {
    title: string;
    hint: string;
    placeholder: string;
    success: string;
    error: string;
    submit: string;
    rateLimitMessage: string;
  };
  todaySummary: {
    title: string;
    greeting: string;
    returning: string;
    defaultPrimary: string;
    defaultSecondary: string;
    todayPrimary: string;
    todaySecondary: string;
    soonPrimary: string;
    soonSecondary: string;
    upcomingPrimary: string;
    upcomingSecondary: string;
    greetingTime: {
      morning: string;
      noon: string;
      afternoon: string;
      evening: string;
      night: string;
    };
  };
  share: {
    title: string;
    download: string;
    close: string;
    mottoFallback: string;
    daysUnit: string;
    countdownCaption: string;
    todayCaption: string;
    todayHero: string;
    togetherCaption: string;
    loveLabel: string;
    marriageLabel: string;
    durationValue: string;
    footerText: string;
    previewSubtitle: string;
    closePreview: string;
  };
  stats: {
    loveDays: string;
    marriageDays: string;
    milestoneCount: string;
    photoCount: string;
    wishCompletion: string;
    visitCount: string;
    deviceOnly: string;
    firstVisit: string;
    lastVisit: string;
  };
  wishes: {
    title: string;
    done: string;
    pending: string;
  };
  anniversary: {
    countdown: string;
    today: string;
    passed: string;
    generateCard: string;
    startedFrom: string;
    clickToClose: string;
    suffix: string;
    templates: {
      normal: string;
      soon: string;
      today: string;
      celebrate: string;
    };
  };
  photoWall: {
    title: string;
    close: string;
    prev: string;
    next: string;
    preview: string;
  };
  music: {
    noMusic: string;
    noMusicFile: string;
    playPause: string;
    prevTrack: string;
    nextTrack: string;
    closePanel: string;
    playMode: string;
    currentMode: string;
    clickToSwitch: string;
    modes: {
      single: string;
      sequence: string;
      shuffle: string;
    };
  };
  seo: {
    keywordsTemplate: string;
    descriptionTemplate: string;
  };
  timers: {
    years: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    datingLabel: string;
    marriageLabel: string;
  };
  timeline: {
    ariaLabel: string;
    now: string;
    hint: string;
  };
  floatingActions: {
    ariaLabel: string;
    currentTheme: string;
    themeChanged: string;
    themeNames: {
      dark: string;
      light: string;
      auto: string;
    };
  };
}

const MESSAGES_MAP: Record<LocaleCode, LocaleMessages> = {
  'zh-CN': MESSAGES_ZH_CN,
  'en-US': MESSAGES_EN_US,
};

// 导出默认消息供组件使用（作为 fallback）
export const DEFAULT_MESSAGES = MESSAGES_MAP[DEFAULT_LOCALE];
export const ENGLISH_MESSAGES = MESSAGES_MAP['en-US'];

// 获取指定 locale 的消息，如果无效则返回默认消息
export function getMessages(locale: LocaleCode): LocaleMessages {
  return MESSAGES_MAP[locale] || DEFAULT_MESSAGES;
}

export { DEFAULT_LOCALE, isValidLocale };
export type { LocaleCode };
