# P3 实现边界

目标与验收以 `docs/comet/changes/p3-first-user-loop/` 的完整规格和 Runtime 为准。

## 组件与数据流

- 后台路由只组合账号概况和业务工作区。平台工作区提供 `OperatorAssignment`，域工作区组合申请列表、文章类型表单/列表、标签表单/列表；请求与竞态处理放入 composable，表单只接收初值/忙碌状态并发出保存事件。
- 小程序首页组合域标题、内容列表和入域/发布入口；“我的”组合账号用户号与入域状态。公开用户检索使用独立最小页面。
- 发布页组合类型选择、`BlockEditor`、`TagPicker` 和发布操作。`BlockEditor` 通过 props/emits 更新有序块；车源表单只编辑单张未发布卡片。草稿和发布异步状态由 composable 管理。
- 预览和详情共用 `ArticleContent` 渲染有序正文/车源；文章头部展示实际作者用户号、域、类型与标签。
- `content-core` 提供两端一致的 Unicode 字数、字段边界、正文/车源规则和公开用户号格式；前端检查不替代服务端权限及数据库事务。

## 复用来源与适配

旧版 `D:\Project\WECHAT-PROJECT` 的首页、publish、detail 内容区是视觉与主要交互参考，规格记录的来源版本为 `83b841f725c8b192ca87e8e07b05545a180a05cb`。使用灰白内容面、橙色操作、标题与段落、多张自由描述车源卡片、标签和预览结构；旧自定义导航、开发令牌、到期/状态、图片/联系/评论占位不进入本次业务。

P2 的 Vue 3 Composition API、原生导航/tabBar、锁浅色及保留的深色源继续使用。账号的 UUID 用于内部关联，新增 8 位公开号码只用于用户识别；检索结果与管理信息分别授权。

## 数据与运行

003 迁移为现有账号补用户号，004 建立 P3 内容与配置表。正常升级不清库；当前 `vflie` 的查看、修改和必要清理已有用户授权。Docker 镜像包含共享校验代码。云托管实际运行版本仍须通过部署及小程序链路单独核验，代码/构建成功不代表已部署。

2026-09-14 用户补充本地测试方式：`apps/testminiprogram` 与正式小程序共用业务源码，独立构建到自己的 dist，通过 HTTPS 请求 `https://wxbk-api.regonx.top/`。正式包仍使用原 CloudRun 适配器；测试构建不触发云端发布。微信云托管发布依赖远程仓库流水线，不能把本地构建记为线上版本已更新。005 迁移为版本切换期间的旧账号 INSERT 增加安全随机默认用户号，当前新 API 仍显式生成并处理唯一冲突。

直连测试模式默认不信任调用方的微信身份头，必须通过 `code2Session` 验证；CloudRun 镜像显式启用可信网关身份注入。结果未明的发布保存原始提交与操作号，先查事务串行化的提交回执；仅刷新规则版本不创建新发布意图。

本地测试构建命令是 `npm run build:testminiprogram`，开发者工具入口为 `apps/testminiprogram/dist/build/mp-weixin`；不要编辑该生成目录。正式与测试产物各自保存，通过 `npm run check:miniprogram-builds` 检查请求路由和会话键互斥、共享页面一致；完整 `npm run build` 自动运行该检查。真机直连还需把 `https://wxbk-api.regonx.top` 加入小程序 request 合法域名。
