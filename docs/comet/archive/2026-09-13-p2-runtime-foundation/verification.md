---
generated_from_state_version: 27
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 4
- 迭代: 1
- 验证器尝试次数: 1
- 完成时间: 2026-09-13T15:51:25.877Z
- 摘要: 独立只读验收覆盖 A1–A24。vflie 仅有身份/域表和汽车验证域种子，无旧内容表，不要求 vcar。platform-operator 为 bootstrap 平台运营者；另有微信绑定普通账号且无域角色。本地 API 健康检查通过，开发令牌被拒绝，未交付项标明指定域运营者、入域审批、发布和阅读。Runtime 的测试、隔离 PostgreSQL、类型检查和生产构建均通过。锁浅色、Cookie 会话、并发与故障恢复与规格一致。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1: 仓库中存在正式工程 `apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`，能在新空库 `vflie` 上本地启动；`experiments/p1-uniapp-probe/` 仍标明为实验，且不是该骨架的拷贝升级。 | 四套正式工程存在且可启动；本地 API /api/health 200；实验探针仍标明非正式。 |
| A2 | passed | brief.md | A2: 可以用正式身份完成：初始化首位平台运营者；管理密码登录识别为该运营者；小程序微信登录产生平台账号。没有开发令牌作为生产授权。 | vflie 有 bootstrap 运营者 platform-operator 与微信绑定普通账号；官方测试覆盖管理/微信登录；X-Dev-Token 为 401。 |
| A3 | passed | brief.md | A3: 物理表覆盖平台账号、微信身份、业务域、域成员、入域申请、运营者资格、管理凭证与会话；预置汽车验证域作为空数据种子存在。没有把内容发布表或旧库表写成已完成的 P2 交付。 | vflie 含身份与域表及汽车验证域种子；无内容表和 vehicle_sheets。 |
| A4 | passed | brief.md | A4: 服务端为 Node.js + PostgreSQL；四套工程位于本仓库上述目录；连接串与密钥只出现在 gitignore 的本地环境文件，不把旧项目 `.env` 提交进新仓库。 | API 为 Node.js + PostgreSQL；四套工程在 apps/；密钥只在 gitignore 的 .env；未交付 S3。 |
| A5 | passed | brief.md | A5: 正式小程序本轮锁浅色（`darkmode` 关闭，窗口/tabBar 使用浅色字面值）；`theme.json` 仍含 dark token；深色 `prefers-color-scheme` 规则以注释保留、未被删除；没有 JS 涂色作为主题机制。 | darkmode 关闭，窗口/tabBar 为浅色字面值；theme.json 保留 dark；深色媒体查询以注释保留；无 JS 涂色。 |
| A6 | passed | brief.md | A6: 新版使用同机新库 `vflie`，该库只有本 change 的新表和预置汽车验证域种子；不要求旧库 `vcar` 仍存在。 | 目标库为 vflie，仅有本 change 表和种子；不要求 vcar 仍存在。 |
| A7 | passed | brief.md | A7: 本轮交付止于骨架、空库与最小身份/鉴权；指定域运营者、入域审批、发布和阅读仍标明未交付。 | /api/meta 与界面标明指定域运营者、入域审批、发布和阅读未交付。 |
| A8 | passed | specs/runtime-foundation/spec.md | 四套正式工程可识别且探针仍是实验 - GIVEN 本 change 的实现已经落在新仓库。 - WHEN 查看仓库根与 `apps/`、`experiments/`。 - THEN 能看到上述四套正式工程；`experiments/p1-uniapp-probe/` 仍标明为实验；正式小程序不是该探针目录的重命名或原地升级。 | 四套正式工程可识别；探针目录独立且仍标明实验。 |
| A9 | passed | specs/runtime-foundation/spec.md | 栈与密钥隔离符合确认 - GIVEN 读者或检查核对本仓库的技术栈与环境文件。 - WHEN 对照已确认决定。 - THEN 四套工程位于本仓库 `apps/` 下；API 为 Node.js 并使用 PostgreSQL；仓库中没有提交旧项目 `.env` 或明文密钥；S3 没有被写成已交付。 | 栈为 Vue 3 与 Node/PostgreSQL；未提交旧 .env 或明文密钥；S3 未写成已交付。 |
| A10 | passed | specs/runtime-foundation/spec.md | 新空库只有新表且不依赖旧库 - GIVEN 实现使用新库 `vflie`，并且已经在该库执行本 change 的迁移。 - WHEN 核对 `vflie` 的 `public` 表。 - THEN `vflie` 只存在本规格的新表和预置种子，没有作为本轮交付的旧 `vehicle_sheets` 表；不要求旧库 `vcar` 仍存在。 | vflie public 无 vehicle_sheets，只有本规格新表和种子；不要求 vcar 仍存在。 |
| A11 | passed | specs/runtime-foundation/spec.md | 新表覆盖身份与域实体且不含内容表 - GIVEN `vflie` 上的迁移已经执行。 - WHEN 列出该库 `public` 用户表。 - THEN 能看到上表所列实体表，以及预置汽车验证域种子行；看不到作为本轮交付的内容发布表或旧 `vehicle_sheets` 表。 | 实库表覆盖规格实体；种子 slug=auto-verify 名称为汽车验证域；无内容表。 |
| A12 | passed | specs/runtime-foundation/spec.md | 初始化平台运营者后管理密码登录成功 - GIVEN 空库已迁移，并且已经用标明用途的配置执行初始化。 - WHEN 使用该配置中的登录名和密码调用管理登录，再读取当前用户。 - THEN 返回的平台账号持有平台运营者资格；没有使用开发令牌。 | platform-operator 为 bootstrap 平台运营者；官方 HTTP 测试完成管理登录；无会话和 X-Dev-Token 均为 401。 |
| A13 | passed | specs/runtime-foundation/spec.md | 小程序微信登录产生平台账号 - GIVEN 微信登录配置可用，或测试中使用可注入的微信客户端替身。 - WHEN 使用尚未绑定的微信身份调用小程序登录。 - THEN 创建平台账号和微信身份绑定，并返回小程序会话；该账号不会仅仅因为登录就成为域成员或域运营者。 | 可注入微信客户端测试创建小程序账号且无域角色；实库有一条微信绑定的非运营者账号。 |
| A14 | passed | specs/runtime-foundation/spec.md | 开发令牌不能作为正式授权 - GIVEN API 已经按本规格运行。 - WHEN 只携带旧式开发令牌、不携带正式会话访问需要身份的接口。 - THEN 请求被拒绝；系统没有把开发令牌当作生产授权。 | 仅带 X-Dev-Token 读取身份返回 401；没有把开发令牌当作生产授权。 |
| A15 | passed | specs/runtime-foundation/spec.md | 正式小程序锁浅色且保留深色源 - GIVEN 正式小程序工程已经创建。 - WHEN 检查 `manifest` / `theme.json` / 页面与组件样式，以及源码中的主题相关 API。 - THEN `darkmode` 已关闭；窗口与 tabBar 为浅色字面值；`theme.json` 仍含 `dark` 段；深色媒体查询以注释保留且未被删除；没有 JS 涂色作为主题机制。 | 源码与构建产物 darkmode 为 false，浅色字面值，dark token 与注释深色规则保留，无 JS 涂色。 |
| A16 | passed | specs/runtime-foundation/spec.md | 本轮未把发布闭环写成已完成 - GIVEN 读者核对本轮交付说明和可运行界面。 - WHEN 寻找指定域运营者、入域审批、发布或阅读。 - THEN 这些能力被标明未交付；本轮可验证的是骨架、空库和登录/身份。 | 元数据、README 和占位面板一致标明发布闭环未交付。 |
| A17 | passed | specs/runtime-foundation/spec.md | 并发身份操作保持唯一性并能回滚 - GIVEN 隔离仓库中的首位运营者尚未创建，或同一账号同时发起两个小程序登录。 - WHEN 并发执行初始化或小程序会话轮换，并模拟事务中途失败。 - THEN 最多一个首位初始化成功；小程序轮换后最多一枚会话有效；失败写入回滚且不破坏原有效会话。 | 初始化有事务锁，会话轮换在事务中；隔离 PostgreSQL 检查覆盖并发唯一性与失败回滚。 |
| A18 | passed | specs/runtime-foundation/spec.md | 平台与域管理会话互相独立且最多三处 - GIVEN 同一平台账号可以登录平台后台和域后台。 - WHEN 该账号分别在平台后台和域后台登录，再在平台后台登录到第 4 处。 - THEN 域后台会话仍有效；平台后台只保留最新三处，最旧的一处被撤销。 | 平台与域各最多三处且互不挤下线；官方测试覆盖第四处挤掉最旧平台会话。 |
| A19 | passed | specs/runtime-foundation/spec.md | 管理端用 HttpOnly Cookie 在同一浏览器恢复登录 - GIVEN 管理端已在当前浏览器登录。 - WHEN 同一后台新开标签或刷新页面，只携带 Cookie、不携带 JS 里的 Bearer 令牌读取当前用户。 - THEN 身份仍然有效；Cookie 为 HttpOnly 且不含 Secure；`document.cookie` 读不到会话值。 | 管理 Cookie 为 HttpOnly、SameSite=Lax、不含 Secure；官方测试可用 Cookie 恢复身份。 |
| A20 | passed | specs/runtime-foundation/spec.md | 临时故障和迟到响应不会损坏当前会话 - GIVEN 用户已有会话，或登录的身份读取尚未结束。 - WHEN 刷新遇到网络或 5xx 故障、凭据被明确拒绝，或旧响应在状态变化后到达。 - THEN 临时故障保留可重试凭据并显示错误；明确失效清除身份；旧响应不能恢复失效身份或覆盖新会话；已离开登录页时不会被强制导航。 | 临时故障保留凭据，401 清除身份，迟到响应被拒绝；前端会话回归覆盖这些路径。 |
| A21 | passed | specs/runtime-foundation/spec.md | 注销结果明确且可重试 - GIVEN 用户发起注销或重复点击注销。 - WHEN 注销失败后重试，或旧注销响应在新会话建立后到达。 - THEN 重复请求合并；失败有可见反馈和重试机会；成功或 401 后完成退出；迟到结果不清除新会话。 | 注销合并重复请求，失败可重试，401 完成退出；迟到注销不清除新会话。 |
| A22 | passed | specs/runtime-foundation/spec.md | 数据库配置不会失真或泄漏凭据 - GIVEN 使用隔离的虚构数据库连接串和可注入的 SSL 探测。 - WHEN SSL 需要回退或连接串无法解析。 - THEN 实际驱动配置与选定模式一致，解析错误及日志不含密码；README 只指导新库 `vflie`，不要求旧库 `vcar` 仍存在。 | SSL 配置与选定模式一致，错误不含密码；README 只指导 vflie，不要求 vcar 仍存在。 |
| A23 | passed | specs/runtime-foundation/spec.md | 开发入口安全且工程检查通过 - GIVEN 正式工程依赖已安装。 - WHEN 运行三端构建、Vue/TypeScript 检查，并以不受信任的 Origin 请求开发服务器的非敏感样例。 - THEN 构建和类型检查通过；可运行的开发服务器不允许该 Origin 跨源读取；小程序没有开放不在范围内的 Web 开发服务。 | typecheck 与生产构建通过；后台拒绝跨源读取，小程序拒绝非微信 HTTP 入口。 |
| A24 | passed | specs/runtime-foundation/spec.md | 登录接口拒绝非对象 JSON - GIVEN 请求体是合法 JSON，但顶层为 `null`、数组或原始值。 - WHEN 调用任一登录接口。 - THEN 返回 400 参数错误，不触发 500 内部故障。 | 两个登录接口对非对象 JSON 返回 400 invalid_body，不触发 500。 |

## 检查

| 检查 | 命令 | 工作目录 | 状态 | 退出码 | 耗时 |
| --- | --- | --- | --- | ---: | ---: |
| API frontend and tooling tests | test | . | passed | 0 | 10351 ms |
| Isolated PostgreSQL concurrency checks | run test:postgres | . | passed | 0 | 7254 ms |
| Vue TypeScript checks | run typecheck | . | passed | 0 | 22956 ms |
| Miniprogram and admin production builds | run build | . | passed | 0 | 12801 ms |

## 阻塞项

_无。_

## 风险与跳过的工作

- 独立验收未再次提交管理密码以免写入新会话；A12 依据实库 bootstrap 行、官方 HTTP 登录测试和现场 401。
- 未在真机重跑完整微信 jscode2session；A13 依据可注入客户端测试和已有微信绑定普通账号。
- auth_sessions 仍有历史 audience=admin 行；当前代码签发 admin-platform/admin-domain。

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | 1 | fail | A5, A6, A10, A15 | 骨架、身份表、初始化与登录、密钥隔离和未交付标记可通过。A5/A15 因未开启官方 Dark Mode 未通过；A6/A10 因使用新库 vflie 而非清空旧库 vcar 未通过。后续用户决定未写入规格，本轮 Verify 失败，需回 Build 修订需求或改回规格行为。 | 2026-09-12T18:19:15.670Z |
| 1 | 2 | 0 | recovery | — | Native confirmed acceptance criteria changed | 2026-09-12T18:30:28.487Z |
| 2 | 0 | 0 | recovery | — | Native confirmed acceptance criteria changed | 2026-09-13T06:08:21.139Z |
| 3 | 1 | 1 | blocked | A1, A2, A3, A6, A10, A11, A12 | 本轮十三项代码修复对应 A17–A22 全部通过，未发现需要返修的必修问题。完整验收为 15 项 passed、7 项 blocked；阻塞集中在真实目标环境及初始化登录链路证据，不代表隔离回归失败。 | 2026-09-13T07:04:44.808Z |
| 3 | 1 | 1 | recovery | — | 用户已将后端部署至微信云托管，并要求把云托管环境和服务信息接入小程序 callContainer；本轮调整现有小程序请求传输，保留已确认的微信 code 登录、会话与权限合同。 | 2026-09-13T07:25:25.773Z |
| 3 | 2 | 1 | blocked | A1, A2, A3, A6, A10, A11, A12 | 本次范围4项通过、7项因真实环境证据缺失而阻塞，无代码失败项。已独立核对规格、源码、构建产物及五项 Runtime 原始日志，最后核对 Builder handoff；未重复检查或操作真实环境。 | 2026-09-13T07:56:46.792Z |
| 3 | 2 | 1 | recovery | — | 用户在只读排查后明确要求开始修复并进入流程。保留已确认的 P2 身份骨架和原生导航需求；修复开发者工具与真机均出现的 requestApi 模块加载失败、页面未注册及底栏图标不可见，核对生成产物与微信实际编译包。现有真实环境验收缺口继续如实保留。 | 2026-09-13T08:31:52.454Z |
| 3 | 3 | 0 | recovery | — | Native confirmed acceptance criteria changed | 2026-09-13T15:09:22.493Z |
| 4 | 1 | 1 | pass | — | 独立只读验收覆盖 A1–A24。vflie 仅有身份/域表和汽车验证域种子，无旧内容表，不要求 vcar。platform-operator 为 bootstrap 平台运营者；另有微信绑定普通账号且无域角色。本地 API 健康检查通过，开发令牌被拒绝，未交付项标明指定域运营者、入域审批、发布和阅读。Runtime 的测试、隔离 PostgreSQL、类型检查和生产构建均通过。锁浅色、Cookie 会话、并发与故障恢复与规格一致。 | 2026-09-13T15:51:25.877Z |



## 结论

独立只读验收覆盖 A1–A24。vflie 仅有身份/域表和汽车验证域种子，无旧内容表，不要求 vcar。platform-operator 为 bootstrap 平台运营者；另有微信绑定普通账号且无域角色。本地 API 健康检查通过，开发令牌被拒绝，未交付项标明指定域运营者、入域审批、发布和阅读。Runtime 的测试、隔离 PostgreSQL、类型检查和生产构建均通过。锁浅色、Cookie 会话、并发与故障恢复与规格一致。
