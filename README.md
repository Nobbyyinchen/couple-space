# Couple Space · 情侣空间

用于两人记录日常、图文回忆、心愿、纪念日和关怀提醒的项目。此仓库只包含源码和虚构的 mock 数据，不包含个人档案、真实照片、聊天记录、云端数据库或原项目 Git 历史。

## 微信小程序

主要项目位于 `miniapp/`，使用原生 WXML、WXSS、JavaScript 和微信云开发。默认启用演示模式；人物“小宇”和“小宙”、起始日期及故事均为虚构示例。演示模式仅使用本机模拟存储，不连接真实云环境。

1. 使用微信开发者工具导入 `miniapp/`。默认 AppID 为游客占位值；工具要求真实 AppID 时请填入你自己的 AppID。
2. 保持 `miniapp/miniprogram/config.js` 中的 `demoMode: true` 体验发布、留言、心愿和双身份切换。
3. 连接自己的云服务前，配置自己的 AppID、云环境、数据库权限和云函数环境变量；将 `demoMode` 改为 `false`。

订阅消息中的 `mock-template-*` 是无效的占位 ID。正式部署必须使用自己审核通过的模板，并核对字段。云资源配置中的示例值也必须替换。

验证命令：

```sh
npm --prefix miniapp test
npm --prefix miniapp run check
```

## 其他目录

- `site/`：Astro 网站版本。
- `scripts/`、`tests/`：本地服务、构建、备份、导出及测试。
- `examples/`：本地网站使用的虚构示例资料。
- `promo-video/`：Remotion 宣传视频源码，使用独立的虚构人物和 mock 数据。

本地服务需要 Node.js 22 或更新版本：`npm start`；测试：`npm test`。网站依赖可在 `site/` 内执行 `npm ci` 安装。

私人资料、运行模型、缓存、依赖目录、导出包和本机私密配置均通过 Git 忽略规则排除。

## License

AGPL-3.0。保留各子项目中的上游许可与署名。
