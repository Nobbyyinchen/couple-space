import type { Config } from './types';

const LOVE_DATE = '2020-01-01';
const MARRIAGE_DATE = '2022-05-20';

export const DEFAULT_CONFIG: Config = {
  boy: 'Mr Li',
  girl: 'Mrs Wang',
  loveDate: LOVE_DATE,
  marriageDate: MARRIAGE_DATE,
  milestones: [
    { date: LOVE_DATE, label: '相恋', icon: '💕', story: '那天我们在一起了，从此每一天都多了一份牵挂。' },
    { date: MARRIAGE_DATE, label: '领证', icon: '💑', story: '拿着小红本走出民政局，阳光正好。从此我们是法律意义上的「我们」了。' },
    { date: '2022-10-01', label: '婚礼', icon: '💍', story: '在亲友的见证下，我们许下誓言。' },
    { date: '2023-01-15', label: '蜜月', icon: '✈️', story: '第一次一起远行，留下美好回忆。' },
  ],
  quotes: [
    "始于初见，止于终老",
    "愿有岁月可回首，且以深情共白头",
    "斯人若彩虹，遇上方知有",
    "春风十里，不如你",
    "与君初相识，犹如故人归",
    "愿得一心人，白首不相离",
    "十年如一日，一日胜十年",
    "柴米油盐是你，星辰大海也是你",
    "执子之手，与子偕老",
    "岁月漫长，有你便是归途",
    "从青丝到白发，从心动到心安",
    "一屋两人三餐四季，十年如故",
    "平淡日子里，你是最温柔的惊喜"
  ],
  music: {
    enabled: false,
    autoPlay: false,
    playMode: 'sequence',
    allowModeSwitch: true,
    startPolicy: 'first',
    volume: 0.7,
    rememberState: true,
    smartShuffleWindow: 3,
    tracks: [],
  },
  secretMessage: '感谢相遇，余生请多指教。♥',
  photos: [
    { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop', caption: '婚礼' },
    { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=400&fit=crop', caption: '相伴' },
    { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop', caption: '牵手' },
  ],
  googleAnalyticsId: '',
  siteUrl: 'https://love.example.com',
  siteName: 'Love Page',
  siteLocale: 'zh-CN',
  siteImage: '/og.png',
  siteLogo: '/og.png',
  seoDescription:
    'Mr Li 与 Mrs Wang 专属爱页面 · 相恋于 2020，结婚于 2022，始于初见，止于终老。记录我们的恋爱与婚姻时光、里程碑故事与纪念日倒计时。',
  shareTemplates: ['classic', 'minimal', 'romantic'],
  statsMode: 'hybrid',
  stats: [
    { label: '一起旅行', value: 12, icon: '✈️' },
    { label: '共同爱好', value: 8, icon: '🎯' },
    { label: '纪念日', value: 2, icon: '💕' },
  ],
  wishes: [
    { text: '一起去冰岛看极光', done: false },
    { text: '每年拍一张合影', done: true },
    { text: '一起学一门新技能', done: false },
  ],
  timers: [
    { label: '相恋时光', icon: '💕', date: LOVE_DATE },
    { label: '婚姻时光', icon: '💍', date: MARRIAGE_DATE },
  ],
  includeDefaultAnniversaries: false,
  anniversaries: [
    {
      label: '相恋纪念日',
      icon: '💕',
      date: LOVE_DATE,
      easterEggTemplates: {
        soon: '💗 距离我们的{displayLabel}还有{gap}天，期待更多美好时光~',
        today: '💗 今天是我们的{displayLabel}，感谢陪伴，爱你如初！',
        celebrate: '{displayLabel}快乐！愿我们的爱永远甜蜜如初见~',
      },
    },
    {
      label: '结婚纪念日',
      icon: '💍',
      date: MARRIAGE_DATE,
      easterEggTemplates: {
        soon: '💍 {gap}天后就是{displayLabel}，一起憧憬下个纪念日~',
        today: '💍 今天是我们的{displayLabel}，感谢携手同行！',
        celebrate: '{displayLabel}快乐！愿此生执子之手，与子偕老。',
      },
    },
    {
      label: '蜜月纪念日',
      icon: '✈️',
      date: '2023-01-15',
      easterEggTemplates: {
        soon: '✈️ 再过 {gap} 天就是{displayLabel}，期待下一次旅行~',
        today: '✈️ 今天就是{displayLabel}，纪念我们的第一次远行！',
        celebrate: '{displayLabel}快乐，愿我们永远在路上',
      },
    },
  ],
  anniversaryCountdownThreshold: 10,
  anniversarySortOrder: 'asc',
  loadingLabel: '正在为你准备...',
  defaultTheme: 'dark',
  sections: {
    todaySummary: true,
    stats: true,
    timeline: true,
    timers: true,
    anniversary: true,
    wishes: true,
    photoWall: true,
    themeToggle: true,
  },
  privacy: {
    privateMode: true,
    noIndex: true,
  },
  welcomeMessage: '欢迎来到我们的专属页面 ♥',
  enableWelcomeMessage: true,
  passwordConfig: {
    enabled: false,
    password: '',
    bruteForceProtection: {
      enabled: true,
      freeAttempts: 5,
      baseLockSeconds: 3,
      maxLockSeconds: 120,
      failureResetMinutes: 30,
    },
  },
};
