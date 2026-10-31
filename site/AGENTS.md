# Repository Guidelines

## 项目结构与模块组织
- `src/pages/index.astro` 是页面入口。
- `src/components/` 存放功能组件（如 `Hero`、`Timeline`、`Timers`、`Anniversary`、`Share`）。
- `src/layouts/BaseLayout.astro` 管理页面公共骨架。
- `src/config.ts` 是内容与功能开关的唯一配置入口，优先在此修改业务文案与展示项。
- `src/styles/global.css` 定义全局样式与主题变量。
- `public/` 放置静态资源（音乐、`favicon.svg`、`robots.txt`、`CNAME`）。
- `.github/workflows/deploy.yml` 负责 GitHub Pages 构建与部署。
- `dist/` 为构建产物目录，禁止手动修改。

## 构建、测试与开发命令
- `npm install`：安装开发依赖。
- `npm run dev`：启动本地开发服务（默认 `http://localhost:4321`）。
- `npm run build`：执行生产构建，输出到 `dist/`。
- `npm run preview`：本地预览构建结果。
- `npm run test`：运行单元测试（Node test runner）。
- `npm ci`：CI 场景下使用的干净安装方式。

说明：当前仓库提供 `npm run test`（Node test runner）；未提供 lint 脚本。提交前建议执行 `npm run build` 并确保通过；若有测试则运行 `npm run test`。

## 代码风格与命名规范
- 遵循 TypeScript 严格模式（`astro/tsconfigs/strict`）。
- TypeScript 与 Astro 脚本统一使用 2 空格缩进。
- 组件文件使用 `PascalCase.astro`，变量/函数使用 `camelCase`，类型与接口使用 `PascalCase`。
- 避免在组件中硬编码可配置文案，优先写入 `src/config.ts`。
- 样式优先复用现有变量与通用类，减少重复 CSS。

## 测试指南
- 目前未集成自动化测试框架。
- 新增复杂逻辑时，建议在 `tests/` 或 `src/**/__tests__/` 新增 `*.test.ts` 测试文件。
- 每次改动后执行 `npm run build`，并在 `npm run dev` 下手动验证关键流程：计时、纪念日倒计时、分享图、音乐播放、移动端布局。
- 在 PR 描述中记录验证步骤与结果。

## 提交与合并请求规范
- 参考现有提交风格：`<type>: <summary>`（如 `chore:`、`feat:`、`fix:`、`refactor:`）。
- 保持提交原子性：一次提交只解决一个明确问题。
- PR 需包含变更范围、原因、关联任务/Issue；涉及 UI 的改动附截图或录屏。
- 发起评审前确保 CI 构建通过。

## 安全与配置建议
- 禁止在源码中硬编码密钥、令牌或私密配置。
- 敏感信息使用环境变量管理；仅将可公开值以 `PUBLIC_` 前缀暴露给前端。
- 引入第三方静态资源或外部链接前，先确认来源可信与版权合规。
