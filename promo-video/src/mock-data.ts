// Fictional promotional fixtures. No imports from the miniapp, vault, or cloud.
export const mockData = {
  people: ['阿栗', '木木'],
  asOfDate: '2026-02-14',
  startDate: '2025-02-14',
  daysTogether: 365,
  memory: {
    author: '阿栗',
    date: '2026.02.13',
    timeLabel: '昨天 17:20',
    title: '把海风，装进今天',
    body: '一起沿着海岸慢慢走。\n今天的小开心，是身边一直有你。',
    likes: 2,
    commentAuthor: '木木',
    comment: '下次还想和你来。',
  },
  wishes: [
    {text: '一起在海边看一次日出', done: false},
    {text: '做一顿热气腾腾的晚餐', done: true},
    {text: '在春天去一次草地野餐', done: false},
  ],
  anniversaries: [
    {title: '下一次春日野餐', date: '2026-03-14', daysUntil: 28},
    {title: '我们的相恋纪念日', date: '2027-02-14', daysUntil: 365},
  ],
} as const;
