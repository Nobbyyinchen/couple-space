# 配置说明

本文档说明项目中所有 `Config` 配置项的用途、默认行为、覆盖方式与常见示例。

## 配置入口

- 统一入口：`src/config.ts`
- 类型定义：`src/config/types.ts`
- 默认值：`src/config/defaults.ts`
- 合并逻辑：`src/config/merge.ts`
- 解析逻辑：`src/config/resolvers.ts`
- 示例配置：`config.example.json`

## 配置加载顺序

1. 读取 `DEFAULT_CONFIG` 作为基础配置。
2. 读取环境变量 `VITE_LOVE_CONFIG_JSON`（JSON 字符串或 JSON 文件路径）。
3. 使用 `deepMerge` 将覆盖项合并到默认配置。
4. 若 `passwordConfig.enabled=true` 且 `passwordConfig.password` 非空，构建阶段自动将密码转换为密文。

## 覆盖合并规则

- 对象：递归合并。
- 数组：整段替换，不做拼接。
- `null` / `undefined`：忽略，不覆盖默认值。
- `VITE_LOVE_CONFIG_JSON` 解析失败：构建报错并中断。

## 顶层配置项

### 基础信息

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `boy` | `string` | `Mr Li` | 页面中男方称呼。 |
| `girl` | `string` | `Mrs Wang` | 页面中女方称呼。 |
| `loveDate` | `string` | `2020-01-01` | 恋爱起始日期，格式建议 `YYYY-MM-DD`。 |
| `marriageDate` | `string` | `2022-05-20` | 结婚日期，格式建议 `YYYY-MM-DD`。 |
| `motto` | `string` | 未设置 | 页面主文案。未设置时回退到 `quotes[0]`。 |
| `secretMessage` | `string` | `感谢相遇，余生请多指教。（默认末尾附加符号）` | 点击彩蛋后的秘密文案。 |
| `loadingLabel` | `string` | `正在为你准备...` | 首屏加载文案。 |
| `welcomeMessage` | `string` | `欢迎来到我们的专属页面（默认末尾附加符号）` | 解锁后欢迎语兜底文案。 |
| `enableWelcomeMessage` | `boolean` | `true` | 是否启用欢迎语弹出功能（包含动态时段问候与访客识别）。 |
| `defaultTheme` | `'light' \| 'dark' \| 'auto'` | `dark` | 默认主题风格。设置为 `auto` 时根据系统偏好自动选择，并在系统深浅色变化时自动同步；用户手动切换后偏好持久化到 localStorage，覆盖 auto 行为。 |
| `siteLocale` | `'zh-CN' \| 'en-US'` | `zh-CN` | 站点语言。决定页面界面文案、模块标题、按钮、提示语的语言版本。可选值：`zh-CN`（中文）、`en-US`（英文）。 |

### 结构化内容

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `milestones` | `Milestone[]` | 内置 4 条 | 里程碑时间线数据。移动端达到 6 条、桌面端达到 8 条时，前端自动切换为横向滚动时间线（保留完整文案）。 |
| `quotes` | `string[]` | 内置多条 | 轮播/随机文案来源。会去重并去空白。 |
| `photos` | `Photo[]` | 内置 3 条 | 照片墙素材。 |
| `stats` | `StatItem[]` | 内置 3 条 | 数据卡片内容。可选。 |
| `statsMode` | `'auto' \| 'manual' \| 'hybrid'` | `hybrid` | 数字模块数据策略：`auto` 纯自动计算，`manual` 纯手动配置，`hybrid` 手动优先并自动补齐；自动统计会遵循 `sections` 开关过滤；开启计时器时不再显示相恋/婚姻天数。 |
| `statsShowVisitCount` | `boolean` | `false` | 是否在数字模块显示本机访问次数（只统计当前设备）。 |
| `wishes` | `WishItem[]` | 内置 3 条 | 愿望列表。可选。 |
| `timers` | `TimeMark[]` | 恋爱时光、婚姻时光 | 计时器列表。 |
| `anniversaries` | `AnniversaryMark[]` | 内置 3 条 | 纪念日卡片与庆祝文案来源。 |

### 音乐与分享

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `music.enabled` | `boolean` | `false` | 是否启用音乐能力。 |
| `music.autoPlay` | `boolean` | `false` | 是否尝试自动播放。受浏览器策略影响。 |
| `music.playMode` | `'single' \| 'sequence' \| 'shuffle'` | `sequence` | 默认播放模式（单曲/顺序/随机）。 |
| `music.allowModeSwitch` | `boolean` | `true` | 是否允许用户在前端切换播放模式。 |
| `music.startPolicy` | `'first' \| 'last' \| 'random'` | `first` | 首次加载策略（首曲/上次/随机）。 |
| `music.volume` | `number` | `0.7` | 初始音量，范围 `0~1`。 |
| `music.rememberState` | `boolean` | `true` | 是否记忆曲目索引、音量与播放模式。 |
| `music.smartShuffleWindow` | `number` | `3` | 随机播放时的“近期不重复”窗口大小（最小 `1`）。 |
| `music.tracks` | `MusicTrack[]` | 空数组 | 歌单列表。开源仓库默认不附带音频文件。 |
| `shareTemplates` | `string[]` | `classic/minimal/romantic` | 兼容保留字段。当前纪念卡生成固定单一样式，不再弹出模板选择。 |

### SEO 与统计

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `googleAnalyticsId` | `string` | 空字符串 | Google Analytics 统计 ID。空值表示关闭。 |
| `siteUrl` | `string` | `https://love.example.com` | 站点基准 URL，用于 SEO 与 Open Graph。 |
| `siteName` | `string` | 未设置 | 站点名称（用于 `application-name`、`apple-mobile-web-app-title`、`og:site_name`、`manifest.name`）。未设置时回退到页面 `title`。 |
| `seoDescription` | `string` | 内置描述 | 页面描述，建议按人名与纪念日定制。 |
| `siteImage` | `string` | 未设置 | 站点代表图（SEO/分享封面）。优先取此项，否则取 `photos[0].url`，最后兜底 `/og.png`。 |
| `siteLogo` | `string` | 未设置 | 主屏幕图标（`apple-touch-icon` / `msapplication-TileImage` / `manifest.icons`）。优先取此项，未设置时回退到 `siteImage` 的解析结果。 |
| `iosStartupImages` | `StartupImage[]` | 未设置 | iOS 启动图配置。可为每项设置 `src` 与可选 `media`（写入 `apple-touch-startup-image`）。未设置或无有效项时回退到 `siteImage` 解析结果。 |
| `privacy` | `object` | 见下表 | 私域访问策略。默认启用私密模式与 noindex。 |

`privacy` 子项：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `privacy.privateMode` | `boolean` | `true` | 私域模式标记，用于界面与策略扩展。 |
| `privacy.noIndex` | `boolean` | `true` | 是否输出 `noindex, nofollow`。私域站点建议保持开启。 |

### 计时与纪念日行为

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `includeDefaultAnniversaries` | `boolean` | `false` | 是否保留默认纪念日。 |
| `anniversaryCountdownThreshold` | `number` | `10` | 进入“临近”状态的阈值（天）。 |
| `anniversarySortOrder` | `'asc' \| 'desc' \| 'default'` | `asc` | 纪念日排序方式。`default` 等同 `asc`。 |

### 区块开关

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `sections` | `object` | 见下表 | 控制首页各功能区显示/隐藏。 |
| `sectionOrder` | `string[]` | `['todaySummary','stats','timers','timeline','anniversary','wishes']` | 首页主体区块的显示顺序。只写想调整的几项即可，没写的按默认顺序排在后面；无效或重复的值会被忽略。照片墙固定在最后。 |

`sections` 子项：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `sections.todaySummary` | `boolean` | `true` | 今日摘要区块。 |
| `sections.stats` | `boolean` | `true` | 数据卡片区块。 |
| `sections.timeline` | `boolean` | `true` | 里程碑时间线区块。 |
| `sections.timers` | `boolean` | `true` | 时光印记区块。 |
| `sections.anniversary` | `boolean` | `true` | 纪念日区块。 |
| `sections.wishes` | `boolean` | `true` | 愿望清单区块。 |
| `sections.photoWall` | `boolean` | `true` | 照片墙区块。 |
| `sections.themeToggle` | `boolean` | `true` | 主题切换按钮。 |
| `sections.share` | `boolean` | 未设置（按组件默认显示） | 浮动分享按钮显示开关。 |

### 密码拦截

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `passwordConfig` | `PasswordConfig` | 内置默认对象 | 页面密码拦截配置。 |

`passwordConfig` 子项：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `passwordConfig.enabled` | `boolean` | `false` | 是否启用密码拦截。 |
| `passwordConfig.password` | `string` | 空字符串 | 访问密码；构建时自动转密文，但仍属于前端可见信息。 |
| `passwordConfig.hint` | `string` | 跟随语言包 | 输入提示文案，填写后优先于语言包。 |
| `passwordConfig.successMessage` | `string` | 跟随语言包 | 验证成功提示，填写后优先于语言包。 |
| `passwordConfig.errorMessage` | `string` | 跟随语言包 | 验证失败提示，填写后优先于语言包。 |
| `passwordConfig.bruteForceProtection` | `object` | 见下表 | 防暴力尝试策略。 |

`passwordConfig.bruteForceProtection` 子项：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | 是否启用限制。 |
| `freeAttempts` | `number` | `5` | 允许的连续失败次数。 |
| `baseLockSeconds` | `number` | `3` | 首次锁定时长（秒）。 |
| `maxLockSeconds` | `number` | `120` | 最大锁定时长（秒）。 |
| `failureResetMinutes` | `number` | `30` | 失败计数重置窗口（分钟）。 |

## 对象字段结构

### `Milestone`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | `string` | 是 | 事件日期。 |
| `label` | `string` | 是 | 事件名称。 |
| `icon` | `string` | 是 | 展示图标。 |
| `story` | `string` | 否 | 事件故事文本。 |

### `Photo`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | 是 | 图片地址。 |
| `caption` | `string` | 否 | 图片说明。 |

### `TimeMark`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | 是 | 计时器标题。 |
| `icon` | `string` | 是 | 展示图标。 |
| `date` | `string` | 是 | 计时基准日期。 |

### `AnniversaryMark`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | 是 | 纪念日名称。 |
| `icon` | `string` | 是 | 展示图标。 |
| `date` | `string` | 是 | 纪念日日期。 |
| `easterEggTemplates` | `AnniversaryEasterEggTemplates` | 否 | 临近/当天/庆祝文案模板。 |

`AnniversaryEasterEggTemplates` 子项：`normal`、`soon`、`today`、`celebrate`，支持占位符：`{label}`、`{displayLabel}`、`{gap}`、`{nth}`。

### `StatItem`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | 是 | 指标名称。 |
| `value` | `string \| number` | 是 | 指标值。 |
| `icon` | `string` | 否 | 展示图标。 |

### `WishItem`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | 是 | 愿望内容。 |
| `done` | `boolean` | 否 | 是否已完成。 |

### `MusicTrack`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 曲目标识，用于状态记忆和去重。 |
| `src` | `string` | 是 | 音频 URL。 |
| `title` | `string` | 是 | 曲目名。 |
| `artist` | `string` | 否 | 艺术家名称，播放器会展示在标题后。 |
| `tags` | `string[]` | 否 | 标签信息，供后续个性化播放策略使用。 |
| `weight` | `number` | 否 | 随机播放权重，必须大于 0。 |

### `MusicConfig`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | 是 | 是否启用音乐功能。 |
| `autoPlay` | `boolean` | 是 | 是否尝试自动播放。 |
| `playMode` | `'single' \| 'sequence' \| 'shuffle'` | 是 | 默认播放模式。 |
| `allowModeSwitch` | `boolean` | 是 | 是否允许用户切换播放模式。 |
| `startPolicy` | `'first' \| 'last' \| 'random'` | 是 | 首次加载曲目策略。 |
| `volume` | `number` | 是 | 初始音量，范围 `0~1`。 |
| `rememberState` | `boolean` | 是 | 是否记忆 `idx/playMode/volume`。 |
| `smartShuffleWindow` | `number` | 是 | 随机播放时避免近期重复的窗口大小。 |
| `tracks` | `MusicTrack[]` | 是 | 歌单数组。 |

### `StartupImage`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `src` | `string` | 是 | 启动图地址（支持绝对 URL 或相对路径）。 |
| `media` | `string` | 否 | 设备匹配条件，会写入 `link[rel="apple-touch-startup-image"]` 的 `media` 属性。 |

## 解析与回退逻辑

- `motto`：取 `motto`，否则取 `quotes[0]`，否则为空。
- `quotes`：先去空白、去重；若为空则回退到 `motto`。
- `music`：
  - `playMode` 非法值回退 `single`；
  - `startPolicy` 非法值回退 `first`；
  - `volume` 会被夹紧到 `0~1`；
  - `smartShuffleWindow` 至少为 `1`；
  - `tracks` 会去重并过滤不合法项（必须包含 `id/src/title`）。
  - 开源仓库默认不提供音频素材，请自行添加有权分发的文件后再启用。
- `timers`：按 `label|icon|date` 去重。
- `anniversaries`：`includeDefaultAnniversaries` 未设置时，若 `anniversaries` 为空则自动补默认两项；最终按 `label|icon|date` 去重。
- `statsMode`：仅接受 `auto/manual/hybrid`，非法值回退 `hybrid`。
- `privacy`：默认 `{ privateMode: true, noIndex: true }`，可按需单项关闭。
- `siteName`：去空白后用于主屏幕名称与站点名，空值回退页面 `title`。
- `siteLogo`：优先使用 `siteLogo`，否则回退 `siteImage` 的解析逻辑（`siteImage` → `photos[0].url` → `/og.png`）。
- `iosStartupImages`：仅保留 `src` 合法项并去重，`media` 会去空白；若无有效项则自动回退为单条 `siteImage` 解析结果。

## 环境变量覆盖

可通过 `VITE_LOVE_CONFIG_JSON` 覆盖默认配置。

### 方式一：传 JSON 字符串

```bash
VITE_LOVE_CONFIG_JSON='{"boy":"LEON","sections":{"photoWall":false}}' npm run build
```

### 方式二：传 JSON 文件路径

```bash
VITE_LOVE_CONFIG_JSON='./config.json' npm run build
```

路径支持：

- 绝对路径
- 相对项目根目录的路径

## 常见配置示例

以下示例均为“覆盖补丁”，会与 `DEFAULT_CONFIG` 执行 deep merge。

### 最小可运行配置

```json
{
  "boy": "LEON",
  "girl": "Alice",
  "loveDate": "2020-01-01",
  "marriageDate": "2022-05-20"
}
```

### 切换为英文站点

```json
{
  "siteLocale": "en-US",
  "boy": "LEON",
  "girl": "Alice"
}
```

### 关闭照片墙与愿望清单

```json
{
  "sections": {
    "photoWall": false,
    "wishes": false
  }
}
```

### 启用密码拦截与防暴力尝试

```json
{
  "passwordConfig": {
    "enabled": true,
    "password": "your-password",
    "hint": "请输入访问密码",
    "successMessage": "验证通过",
    "errorMessage": "密码错误",
    "bruteForceProtection": {
      "enabled": true,
      "freeAttempts": 5,
      "baseLockSeconds": 3,
      "maxLockSeconds": 120,
      "failureResetMinutes": 30
    }
  }
}
```

## 其他配置相关说明

- URL 参数 `p` / `password` 支持自动解锁，成功后会清理参数，仅建议用于临时兼容，不建议作为默认分享方式。
- 前端密码保护用于提高访问门槛，不等同后端鉴权；密码或其等价校验值仍可被浏览器端获取。
- 生产环境建议通过环境变量注入覆盖配置，避免直接改仓库默认值。
- 不要在源码中硬编码真实密钥或敏感凭证。

## 排错建议

- 构建时报 `Failed to parse VITE_LOVE_CONFIG_JSON`：检查 JSON 语法或路径。
- 覆盖不生效：确认字段路径正确，且未把对象误写为数组。
- 数组内容异常：确认你预期的是“整段替换”，而不是增量合并。
- 密码仍可明文访问：确认 `passwordConfig.enabled=true` 且 `password` 非空，并重新执行构建。
