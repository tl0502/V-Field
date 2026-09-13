# v域 · 独立新版

本工作区采用「独立新版分阶段重建」路线，以微信小程序为产品端，面向跨行业信息社区：平台提供通用能力，外部运营者经营业务域，内容使用平台提供的 Block，汽车作为首个验证场景。

## 入口

- [已确认方向与重建边界](docs/project/overview.md)
- [整体重建规划与功能恢复清单](docs/project/rebuild-plan.md)
- [P1 产品规则](docs/project/product-rules.md)
- [P1 关键可行性](docs/project/feasibility.md)
- 当前 Native change：`p2-runtime-foundation`（正式工程骨架、空库、最小身份/鉴权）。已归档：`p1-product-rules-feasibility`、`plan-staged-rebuild`。
- Codex 入口：`AGENTS.md`；Claude Code 入口：`CLAUDE.md`。

在本目录运行 `comet.cmd status . --json` 查看实际进度。正式 brief、完整目标规格和 Runtime 状态位于 `docs/comet/changes/`。

## 正式工程

本仓库四套工程：

| 目录 | 说明 | 本地启动 |
| --- | --- | --- |
| `apps/miniprogram` | uni-app + Vue 3，只编译微信小程序 | `npm run dev:miniprogram`，再在微信开发者工具打开 `apps/miniprogram/dist/dev/mp-weixin` |
| `apps/api` | Node.js + PostgreSQL | `npm run dev:api`（`127.0.0.1:3064`） |
| `apps/admin-platform` | 平台级管理网页 | `npm run dev:admin-platform`（`127.0.0.1:5173`） |
| `apps/admin-domain` | 域级管理网页 | `npm run dev:admin-domain`（`127.0.0.1:5174`） |

`experiments/p1-uniapp-probe/` 仍是 P1 实验原型，不是正式小程序。

本轮可验证：空库、首位平台运营者初始化、管理密码登录、小程序微信登录。指定域运营者、入域审批、发布和阅读尚未交付。

密钥只放在被 gitignore 的 `apps/api/.env`。复制 `apps/api/.env.example`，把 `DATABASE_URL` 配置为新版空库 `vflie`，然后运行 `npm run db:migrate` 与 `npm run bootstrap`。初始化会拒绝重复创建首位平台运营者。

`npm run db:reset` 会删除当前配置库的整个 `public` schema，仅供明确需要重建的隔离数据库使用，需要显式设置 `ALLOW_DB_RESET=1`。正常初始化不需要重置；本轮不得对旧库 `vcar` 执行该命令。

## 小程序连接微信云托管

小程序通过 `wx.cloud.callContainer` 调用现有 API。公开的路由配置集中在 `apps/miniprogram/src/utils/config.ts`：

- 环境 ID：`prod-d0g5k4jihd0ba8de4`（控制台的 `prod` 环境）。
- 服务名：`vfield`（填写服务名，不填 `vfield-001` 等版本名）。

`src/utils/requestApi.ts` 在首次请求前执行一次 `wx.cloud.init()`，为每次请求附上环境 ID、`X-WX-SERVICE`、会话和受众，并处理 HTTP 错误。登录、读取身份与退出仍调用 `/api/auth/wechat/login`、`/api/auth/me` 和 `/api/auth/logout`；控制台示例 `/api/count` 不是本项目的接口。`callContainer` 会在请求头注入 `X-WX-OPENID` / `X-WX-APPID`；后端优先用这些头建立小程序会话，避免再走 `jscode2session`。公网直连仍可用 `uni.login()` 的 code 换票。`WECHAT_APP_SECRET`、数据库连接串和管理密码只配置在后端。仓库根目录的 `Dockerfile` 只打包 API，容器监听 `0.0.0.0:80`，探活路径为 `/`、`/health` 或 `/api/health`。修改 API 后需要重新发布云托管服务 `vfield` 才会在小程序链路生效。

此方式要求微信基础库至少 `2.23.0`，且小程序有权访问该云托管环境；正式发布前在小程序管理后台设置对应的最低基础库版本。通过 `callContainer` 发起的请求无需添加公网域名到 request 合法域名。参考 [微信官方调用说明](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/call/mini.html)。

修改源码或云托管路由后，在仓库根目录运行 `npm run build:mp-weixin -w @vquan/miniprogram`，在微信开发者工具打开 `apps/miniprogram/dist/build/mp-weixin` 后重新编译、预览或上传。小程序 AppID 为 `wx881064c3dbe54a18`；不要直接编辑生成目录。

## 开发检查

- `npm test`：API 单元/HTTP、三端会话故障与竞态、开发服务器边界回归。默认不连接 `.env` 中的数据库。
- `npm run test:postgres`：需要本机 Docker；自动启动只绑定回环地址的一次性 PostgreSQL 17 容器，检查真实事务、并发、回滚和迁移后删除该容器。测试数据不挂载到项目或已有数据库。
- `npm run typecheck`：对小程序、后台和共享包执行 Vue/TypeScript 检查，包含 `.vue` 模板。
- `npm run build`：构建微信小程序和两套后台。

数据库集成测试只接受回环地址、库名以 `vquan_test_` 开头的 `TEST_DATABASE_URL`；不把业务 `DATABASE_URL` 当测试目标。

后台使用 Vite 6.4.3，开发服务器关闭跨源读取，并只开放当前后台、共享包及依赖目录。稳定版 uni-app 仍要求 Vite 5，小程序使用兼容的 5.4.21，但配置只允许微信 `build` / watch，拒绝 serve、preview 和 H5。该依赖分支仍有 HTTP 开发服务器相关审计告警，不能把限制入口表述为整个依赖树审计清零。

## 工作区关系

本目录 `D:\Project\WECHAT-PROJECT-next` 拥有独立 Git 仓库和 COMET 状态。旧项目 `D:\Project\WECHAT-PROJECT` 保留作参考；不修改其源码或 `.env`。P2 使用同机新空库 `vflie`，只写入新表及种子，不清空或改写旧库 `vcar`，不迁移旧账号和业务数据。
