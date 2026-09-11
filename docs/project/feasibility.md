# P1 关键可行性

确认日期：2026-09-11。本文记录会改变设计的平台限制。结论区分：官方文档所述前置条件、本 change 实际核对、用户陈述、以及明确未验证项。

实验原型：`experiments/p1-uniapp-probe/`。它不是 P2 正式基础，也不能代替真机或 iOS 验收。

## 核对范围

本 change 要在微信开发者工具中，对 uni-app 产物做最小核对。分工如下：

- 助手：确认实验原型能编译、能打开，并记录官方文档限制和结构化事实。
- 人工：在开发者工具模拟器切换系统浅色 / 深色，再切到首页、次页、原生页，判断业务区换色、系统切换闪色、切页首帧、底栏和原生弹窗/键盘。

实验使用原生 tabBar，方便人工切换。自定义 tabBar 换色留到后续正式实现再验，不在这次人工切换里冒充已经完成。

不覆盖：Android 真机复现旧主题问题、iOS、支付、内容安全接口。人工清单见 `experiments/p1-uniapp-probe/CHECKLIST.md`。

## 主题与原生界面

**规划层需求（P0）：** 浅色、深色、跟随系统三档。

**微信端合同（用户 2026-09-11 确认 B）：** 微信用户端只跟随系统 / 微信 DarkMode。应用内强制浅色或深色，不作为微信端无闪全局能力。

**旧实现事实：** 现网小程序把主题固定为浅色。`apps/miniprogram/app.json` 无 `darkmode`、无 `theme.json`，`window.backgroundColor` 写死 `#f7f8fa`。`utils/theme.js` 注释写明「不读取系统主题、不跟随切换」，`themeClass` 恒为 `theme-light`。这是旧代码事实，不是新版已经修复。

**当前实验曾用的失败路径（本仓库可核对，不是猜测）：**

1. 只开 `darkmode: true`，没有 `themeLocation` / `theme.json`。
2. `pages.json` 把每个页面的 `backgroundColor` / `backgroundColorTop` / `backgroundColorBottom` 和原生 tabBar 写死为浅色。
3. 业务样式靠 JS class，在 `uni.onThemeChange` 之后再 `uni.setBackgroundColor` / `uni.setTabBarStyle`。

这会在系统由浅切深时闪浅色：原生窗口色仍是 JSON 里的浅色，JS 只能在主题变化事件之后涂当前页。[wx.setBackgroundColor](https://developers.weixin.qq.com/miniprogram/dev/api/ui/background/wx.setBackgroundColor.html) 只描述「动态设置窗口的背景色」，没有提供给未入栈 tab 预涂色的接口。

**微信端可用方案（官方文档，不是猜测）：**

依据 [微信 DarkMode 适配指南](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/darkmode.html) 与 [uni-app DarkMode 适配指南](https://uniapp.dcloud.net.cn/tutorial/darkmode.html)：

1. `manifest.json` → `mp-weixin`：`darkmode: true`，`themeLocation: "theme.json"`。
2. `theme.json` 分别定义 light / dark 的窗口色、顶栏色、底栏色。
3. `pages.json` 的 `globalStyle`、页面 `backgroundColor*`、原生 `tabBar` 颜色全部用 `@变量`，不要写死浅色。
4. 业务 WXSS 用 `@media (prefers-color-scheme: dark)`，并且按官方示例改 **直接颜色**（`background-color` / `color`），不要只改 CSS 变量再让组件 `var()` 引用。自定义组件必须在自身样式里写深色规则，因为页面样式进不了组件隔离。
5. 不要再用 JS 在 `onThemeChange` 里 `setBackgroundColor` / `setTabBarStyle`，也不要用 `theme-dark` class 涂业务色。窗口和底栏由 `theme.json` 自动切换。`onThemeChange` 只更新文案等非样式状态。

实验原型按上述路径实现。系统切换是否还闪，以人工结果为准，未跑不得写成已消除。

**已否决的路径（本仓库可核对，不是猜测）：**

1. 只改 CSS 变量、组件用 `var()` 涂色：浅切深后暗色无法加载。官方 WXSS 示例改的是直接属性。[DarkMode 适配指南 · WXSS 适配](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/darkmode.html)
2. 媒体查询之上再叠更高优先级的 `.theme-dark`，且浅色侧写成空 class、没有对等 `theme-light`：浅切深能进去，深切浅回不去。
3. App.vue setup 调用 `onLaunch` 或 composable 具名导出：uni-app 编到微信后可能不是函数，App 启动抛错。App.vue 只保留样式。

[uni-app x 主题教程](https://doc.dcloud.net.cn/uni-app-x/api/theme-change.html) 对小程序的建议与微信官方一致：业务样式用媒体查询，无需动态切换 class。

**能力边界：**

| 区域 | 微信端合同 | 本 change 的结论类型 |
| --- | --- | --- |
| 业务页面背景、文字、卡片、自定义导航 | 跟随系统，用 `prefers-color-scheme` | 用户判定开发者工具模拟器与真机均通过 CHECKLIST；结论写入下方「实测记录」 |
| 原生窗口背景、原生 tabBar | 跟随系统，用 `theme.json` `@变量` | 同上；若仍闪色，记为客户端限制，不是再加一层 JS 强制同步 |
| 应用内强制浅色 / 深色 | 微信端不做 | 官方没有把原生窗口/底栏从系统主题里拆出去的无闪 API |
| 微信授权弹窗、系统键盘、输入法 | 不一定能被业务样式完全控制 | 只记录实际表现，不承诺任意换肤 |

用户报告过 Android 真机与开发者工具中部分页面不变色、切页闪白、弹窗或键盘颜色不一致。这些仍是旧版验收线索。本 change **没有**把它们写成已经复现或已经修复。新版探针的模拟器与真机视觉由用户判定通过，不等于旧问题根因已定位。iOS 未单独声明，保持未测。

## 个人主体与开放能力

用户说明：当前小程序没有企业申请。这是用户陈述，不是本机登录开放平台后的账号后台截图。

官方文档可核对的限制（[小程序产品定位及功能介绍](https://developers.weixin.qq.com/miniprogram/introduction/)）：

- 个人类型账号暂不支持微信认证。
- 已认证账号可使用微信支付；因此个人主体不能走认证，也就不能申请微信支付。
- 个人主体与非个人主体的服务类目不同。
- 小程序绑定微信开放平台并使用 UnionID：开放平台账号必须完成开发者资质认证，才能绑定同主体小程序。

这些限制不让整个产品端不可做。它们把支付、微信认证、以及「小程序与网站微信登录识别为同一用户」标成高风险，而不是首期必交付能力。

## 管理端网页微信登录

官方网站应用微信登录（[微信登录说明](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)）前置条件：

1. 在微信开放平台注册开发者账号。
2. 拥有一个已审核通过的网站应用，取得 AppID / AppSecret。
3. 申请微信登录并通过审核。

若要与小程序识别为同一平台账号，还需要 UnionID，也就是完成开放平台开发者资质认证并绑定同主体小程序。

**本 change 结论：**

- 目标身份模型：管理后台与小程序同一套平台账号。
- 首期可验收路径：平台账号 + 管理密码。管理密码是管理端凭证，不是第二套用户。
- 网页微信扫码登录：列为待验证增强能力。在未核对本账号是否具备网站应用、资质认证和 UnionID 绑定前，**不得写成已经开通**。
- 没有企业资质会提高上述增强能力不可用的概率，但不自动禁止用管理密码完成首期闭环。

本 change 没有登录用户的微信开放平台账号后台，因此「本账号是否已开通网站应用」保持未验证。

## 安全相关

- 旧发布使用 `X-Dev-Token`，且内容未绑定作者或业务域。新版正式发布不能沿用该方式。
- 旧头像上传有文件类型和大小校验。这不等于内容安全审核已完成。
- 完整内容审核、认证审核、联系方式申请审批后置，但必须保持未交付。

## 实测记录

由 Build 在实验原型上填写。未执行的项保持「未跑」，不得改写成通过。

| 项 | 方法 | 结果 | 边界 |
| --- | --- | --- | --- |
| uni-app 编译为微信小程序 | `npm run build:mp-weixin`，开发者工具打开 `dist/build/mp-weixin` | 已重编为 theme.json + 直接颜色媒体查询；无 `setBackgroundColor`、无 `theme-dark` class | 实验目录，非正式工程，不能当作 P2 正式基础 |
| 跟随系统、浅切深、深切浅、切页首帧、底栏 | 人工按 CHECKLIST，开发者工具模拟器 + 真机 | 用户判定通过：浅切深能进深色，深切浅能回浅色，切页首帧与底栏可接受；未另报残留闪色或单向不能换色 | 实验原型。失败路径（只改 CSS 变量、叠加 `theme-dark` class）已否决并清理 |
| 自定义顶栏 | 人工在各页观察 | 用户判定模拟器与真机均通过 | 实验原型 |
| `wx.showModal` / 键盘 | 人工在原生页操作 | 用户判定模拟器与真机均通过 | 原生界面颜色不跟随页面时仍记为平台限制，不承诺任意换肤 |
| 网页微信扫码登录对本账号是否可用 | 开放平台账号后台 | 未跑 | 无企业资质；无本账号后台核对 |
| Android 真机旧主题问题 | 对照旧版复现 | 未跑 | 新版探针真机视觉通过，不等于旧问题已定位或已修复 |
| iOS | 真机 | 未跑 | 用户确认真机通过，但未单独声明 iOS |
