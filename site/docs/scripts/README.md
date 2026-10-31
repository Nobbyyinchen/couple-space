# 脚本索引

## App 脚本

- `src/scripts/app/payload.ts`
  - 负责解析并归一化 `AppScript` 的 JSON 载荷。
- `src/scripts/app/initApp.ts`
  - 负责初始化页面通用交互（文案轮播、滚动显隐、点击爱心、彩蛋、欢迎提示）。

## Anniversary 脚本

- `src/scripts/anniversary/logic.ts`
  - 负责纪念日核心计算与模板渲染（临近天数、序号、展示文案）。

## Share 脚本

- `src/scripts/share/memorialCard.ts`
  - 负责纪念卡目标纪念日选择与展示文案决策（最近项、专属项、today/soon/normal 模式），并支持按 locale 注入纪念日模板与展示标签。

## Password Guard 脚本

- `src/scripts/passwordGuard/rateLimit.ts`
  - 负责密码防暴力尝试限流的纯函数逻辑（解析、状态清洗、重置、锁定时长计算）。

## Astro 脚本约束

- 组件内需要被 Astro 打包的脚本，使用 `<script>`，不要手动写 `type="module"`。
- `define:vars` 脚本会以内联方式输出，禁止在其中使用 `import`。
- 需要服务端传值且又要 `import` 时，先用 `application/json` payload 注入数据，再在独立打包脚本中读取。
- 回归保护见 `tests/astro-script-safety.test.ts`。
