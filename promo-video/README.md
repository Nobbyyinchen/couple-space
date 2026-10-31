# 情侣空间 · 全 mock 数据推广片

主题：把普通的日子，慢慢写成我们。

- 成片：`out/couple-space-promo-mock-30s.mp4`，1080 × 1920，30fps，30 秒，H.264 + AAC。
- 封面：`out/cover-mock.png`。
- 文案、分镜与素材依据：`推广文案与分镜.md`。
- 可编辑源码：`src/Promo.tsx`；品牌默认参数在 `src/Root.tsx`。
- 全部展示数据：`src/mock-data.ts`；展示界面组件：`src/MockScreens.tsx`。
- 配乐：`public/music.wav`，本项目原创程序合成，无人声。

## 预览与导出

在此目录执行 `npm install` 安装依赖，`npm run dev` 打开工作台。选择 `CoupleSpace`，拖动时间轴预览。

```powershell
npm run render
npm run cover
npm run lint
```

重新生成配乐：`node scripts/make-music.mjs`。可选配音稿保存在分镜文件中，首版尚未录制配音。

## 素材说明

人物昵称为虚构的「阿栗」「木木」。手记、留言、喜欢数量、心愿、相恋日期、天数和纪念日均来自独立的 mock 数据文件，完全不读取小程序业务配置、历史界面截图、真实资料或云端数据。界面用 React 绘制，沿用纸张手账风格，画面中标明虚构演示数据。插画为项目已有的通用示意素材。当前 CTA 为「邀请另一半，一起写下第一页」。

固定演示时间为 2026-02-14，虚构相恋日期为 2025-02-14，相伴 365 天。两条纪念日倒计时均以该演示时间计算。字体使用 Windows 本机宋体与微软雅黑；其他系统可替换字体并重新核对排版。原小程序在 `../miniapp`，本片未修改其源码、配置或云端数据。

## 验证

`npm run lint` 检查 ESLint 与 TypeScript；逐段检查 5 个关键画面；成片通过 FFprobe 参数检查与 FFmpeg 完整解码检查。实际参数见 `out/verification.json`。

Remotion 的使用须遵循其项目许可，详见安装包附带的许可文件。
