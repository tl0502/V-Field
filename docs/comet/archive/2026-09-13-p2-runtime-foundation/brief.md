# Outcome

为 v域新版建立 P2 最小运行与权限基础：在本仓库落地四套正式工程骨架，在同机新空库 `vflie` 按 P1 实体合同写入空表，并提供可验证的最小身份与鉴权。本 change 不把 `experiments/p1-uniapp-probe/` 升级为正式小程序，也不交付指定域运营者、入域审批、发布或阅读。

用户本轮确认：骨架 + 空库 + 最小身份/鉴权；本仓库四套工程；服务端采用旧候选 Node.js + PostgreSQL；数据库使用同机新库 `vflie`；用户已删除旧库 `vcar`，本轮不再核验该库；正式小程序本轮锁浅色并保留深色源；完成这部分后停下供审查。

# Scope

- 在当前仓库建立正式工程骨架，目录为 `apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`。用户端 uni-app + Vue 3 只编译微信小程序；两套管理端为独立 Vue 3 网页；API 为自建 Node.js 服务。
- 新版 API 连接同主机 `199.85.8.5:5432` 上的新库 `vflie`。在该库写入本 change 的新表和预置汽车验证域种子。不迁移旧行。不重建、不连接旧库 `vcar`。不修改旧项目源码、Git 状态或 `.env` 文件。
- 按 P1 实体合同设计并实现最小物理表：平台账号、微信身份、业务域（预置汽车验证域）、域成员、入域申请、平台/域运营者资格、管理凭证、会话。不把内容表、消息表或媒体表当成已交付。
- 提供可验证的正式身份与鉴权：标明用途的初始化配置产生首位平台运营者；管理端用同一平台账号的管理登录名 + 管理密码登录；小程序微信登录产生平台账号。真实授权不使用开发令牌。
- 规划层仍记录浅色、深色、跟随系统三档。因官方微信 Dark Mode 不可靠，本轮正式小程序锁浅色：`darkmode` 关闭，窗口/tabBar 使用浅色字面值；`theme.json` 的 dark token 与页面/组件内已注释的 `prefers-color-scheme` 深色规则必须保留，不得删除。不用 JS class、`setBackgroundColor` 或 `setTabBarStyle` 涂色。恢复跟随系统不在本轮验收。
- 本轮实现完成后停下，等用户审查，再进入后续验收或 P2 其余能力。

## 审查修复范围

用户在完整代码审查后明确要求「修复这些问题」。本轮继续修复已展示的 11 项 P1/P2 与 2 项 P3：旧库操作指引、可运行开发服务器的 Vite 漏洞、首位运营者初始化与会话轮换的并发原子性、三端临时请求失败丢失会话、注销失败无反馈及迟到响应、微信登录迟到响应与页面跳转、数据库 SSL 配置覆盖与错误日志泄密、小程序请求类型、登录请求的 JSON 顶层参数校验。

保留新库 `vflie`、微信端锁浅色与现有 API 地址。用户已删除旧库 `vcar`，本轮不再核验该库。验证使用隔离数据、可注入客户端、本地构建，以及针对 `vflie` 的只读库检查。修复属于当前身份骨架，不拆分新的业务 change。

## Source coverage

| ID | 来源定位与单元 | 读取状态 | 保留语义 | Spec 位置 | 验收 ID | 覆盖状态 | 理由或替代关系 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 用户：归档 P1 并开 P2；问框架是否已搭建、P2 第一项工作 | complete | 启动 P2；正式工程尚未搭建，第一项是骨架 | Requirement: 正式工程骨架 | A1 | covered | 仓库根无正式 `package.json` / `apps/` |
| S2 | `docs/project/rebuild-plan.md`：P2 最小运行与权限基础 | complete | 空数据环境、身份、归属、鉴权；后续不再用临时开发身份 | Requirement: 最小身份与鉴权 | A2 | covered | 本 change 做到登录与资格表，不做到发布 |
| S3 | `docs/project/product-rules.md`：概念实体与归属 | complete | 实体合同已冻结；P2 设计物理表，不沿用旧表 | Requirement: 空库与物理表 | A3 | covered | 在 `vflie` 按新合同建表 |
| S4 | 同文件：首期闭环所需身份与权限 | complete | 指定运营者、申请、审批依赖真实账号与角色 | Requirement: 最小身份与鉴权 | A2 | covered | 本轮交付登录与初始化，不交付指定/审批界面 |
| S5 | 同文件：技术选型 | complete | uni-app + Vue 3 仅微信；自建 API；两套管理网页 | Requirement: 技术栈与目录 | A4 | covered | 用户确认采用 Node.js + PostgreSQL |
| S6 | `docs/project/feasibility.md`：实验不能当 P2 基础 | complete | 另建正式工程；探针只作 Dark Mode 参考 | Requirement: 正式工程骨架 | A1 | covered | 已归档 P1 |
| S7 | 同文件：微信端只跟随系统 | complete | 规划层三档与跟随系统仍记录 | Requirement: 微信端锁浅色 | A5 | superseded | 由 S11 替代本轮验收合同 |
| S8 | P0/P1：本阶段不清理旧库，建独立空库 | complete | 独立空库，不清理旧库 | Requirement: 同机新空库 vflie | A6 | superseded | 先被 S9 替代，再由 S12 替代 |
| S9 | 用户本轮：复用旧项目数据库并执行一次清空 | complete | 复用旧 `DATABASE_URL` 指向的库并一次清空 | Requirement: 复用旧库并一次清空 | A6 | superseded | 由 S12 替代；旧库 `vcar` 调查结果保留为背景 |
| S10 | 用户本轮：完成骨架+空库+最小身份/鉴权后停下审查 | complete | 本轮交付到该切片即停 | Requirement: 本轮停止点 | A7 | covered | 审查后再 Verify 或继续 |
| S11 | 用户后续：官方 Dark Mode 不可靠，正式小程序锁浅色，深色源保留 | complete | 本轮 `darkmode` 关闭；浅色字面值；dark token 与注释媒体查询不删；无 JS 涂色 | Requirement: 微信端锁浅色 | A5 | covered | 不把锁浅色写成微信端无闪全局能力 |
| S12 | 用户后续：数据库名字可以变；改用新空库 `vflie`，不清空旧库 | complete | 同机新空库 `vflie`；不清空 `vcar`；不改旧项目文件 | Requirement: 同机新空库 vflie | A6 | superseded | 由 S13 替代；主机仍为 `199.85.8.5:5432` |
| S13 | 用户后续：已删除旧库 `vcar`，旧库不要管了 | complete | 只核新库 `vflie`；不要求 `vcar` 仍存在；不重建旧库 | Requirement: 同机新空库 vflie | A6 | covered | 本 change 不连接、不重建 `vcar` |
| B1 | 仓库根现状：无正式 package.json/apps/src/API | complete | 框架规范尚未搭建 | Requirement: 正式工程骨架 | A1 | background | 可调查事实 |
| B2 | 旧库只读调查：`vcar` 现有 13 张 public 表 | complete | 当时旧库事实 | Requirement: 同机新空库 vflie | A6 | superseded | 用户已删除 `vcar`，由 S13 替代 |

# Non-goals

- 不交付指定域运营者界面、入域申请/审批、内容发布、列表/详情阅读、发现、消息、资料编辑或自定义 tabBar 业务。
- 不把 `experiments/p1-uniapp-probe/` 改成正式小程序，不把它当作 P2 基础。
- 不迁移旧账号或业务数据；新库 `vflie` 按新合同从空表开始。
- 不重建、不连接、不验收旧库 `vcar`。
- 不修改旧项目 `D:\Project\WECHAT-PROJECT` 的源码、Git 状态、`.env` 或运行配置文件。
- 不把网页微信扫码登录写成已开通；管理端本轮仍是登录名 + 管理密码。
- 本轮不把跟随系统 / 官方 Dark Mode 写成已交付；不删除深色源。
- 不把锁浅色写成微信、系统或输入法界面的无闪全局能力。
- 不在本轮接入 S3/对象存储，不恢复头像上传。
- 不把旧 `X-Dev-Token` 或旧表结构当作新版授权或表设计。

# Acceptance examples

- A1: 仓库中存在正式工程 `apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`，能在新空库 `vflie` 上本地启动；`experiments/p1-uniapp-probe/` 仍标明为实验，且不是该骨架的拷贝升级。
- A2: 可以用正式身份完成：初始化首位平台运营者；管理密码登录识别为该运营者；小程序微信登录产生平台账号。没有开发令牌作为生产授权。
- A3: 物理表覆盖平台账号、微信身份、业务域、域成员、入域申请、运营者资格、管理凭证与会话；预置汽车验证域作为空数据种子存在。没有把内容发布表或旧库表写成已完成的 P2 交付。
- A4: 服务端为 Node.js + PostgreSQL；四套工程位于本仓库上述目录；连接串与密钥只出现在 gitignore 的本地环境文件，不把旧项目 `.env` 提交进新仓库。
- A5: 正式小程序本轮锁浅色（`darkmode` 关闭，窗口/tabBar 使用浅色字面值）；`theme.json` 仍含 dark token；深色 `prefers-color-scheme` 规则以注释保留、未被删除；没有 JS 涂色作为主题机制。
- A6: 新版使用同机新库 `vflie`，该库只有本 change 的新表和预置汽车验证域种子；不要求旧库 `vcar` 仍存在。
- A7: 本轮交付止于骨架、空库与最小身份/鉴权；指定域运营者、入域审批、发布和阅读仍标明未交付。

# Constraints and invariants

- P1 已归档：角色不能合并；内容必须同时有作者和业务域；发布是域成员权；访客可读已发布公开字段。本轮不实现发布/阅读，但表和身份模型不得与该合同冲突。
- 新版从空数据开始。首位平台运营者来自标明用途的初始化配置。
- 旧 Node.js + PostgreSQL 按新合同重写后采用；S3 本轮不采用。
- 使用同机新库不等于复用旧表、旧行、旧密钥文件或旧 Runtime，也不要求旧库 `vcar` 仍存在。
- 正式工程不得把实验探针的页面、依赖或测试 AppID 当作默认业务基础。
- 规划层三档主题需求仍在；本轮正式小程序锁浅色不取消该规划，也不删除深色源。
- Runtime 状态由 COMET 管理；正式需求只写在本 brief 与完整目标 Spec。

# Decisions

- 已确认（用户，代码审查后）：修复上一轮完整审查列出的 13 项问题；以并发与故障回归、严格类型检查和三端构建验证，保留本 change 已确认的业务范围及环境边界。

- 已确认（用户）：归档 P1，立即开始 P2 Native change `p2-runtime-foundation`，隔离方式为当前目录 `main`。
- 已确认（事实）：仓库根没有正式 `package.json` / `apps/` / API / 管理端；P2 第一项实现工作是搭建正式工程框架。
- 已确认（P1）：用户端 uni-app + Vue 3 只编译微信；两套管理网页；规划层微信端只跟随系统。
- 已确认（用户，Q1）：本 change 交付骨架 + 空库 + 最小身份/鉴权。指定域运营者、入域审批、发布/阅读不在本轮。
- 已确认（用户，Q2）：四套工程放在本仓库：`apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`。
- 已确认（用户，Q3）：服务端采用旧候选 Node.js + PostgreSQL，按新合同重写。
- 已确认（用户，随后废止）：曾决定复用旧库 `vcar` 并执行一次清空。该决定被 S12 替代，不再作为本轮验收。
- 已确认（用户）：数据库名字可以改变。新版使用同机新库 `vflie`（`199.85.8.5:5432`），不修改旧项目文件。
- 已确认（用户）：旧库 `vcar` 已删除，本轮不再核验该库是否仍存在或未被清空；只核 `vflie`。该决定替代 S12。
- 已确认（用户）：完成上述切片后停下，供用户审查。
- 已确认（用户）：官方微信 Dark Mode 不可靠，本轮正式小程序锁浅色；深色源（`theme.json` dark token 与已注释媒体查询）保留，不得删除；不用 JS 涂色。
- 已确认（用户，验收失败后）：把 A5/A15、A6/A10 改成上述锁浅色与 `vflie` 合同，而不是改回官方 Dark Mode 或清空 `vcar`。
- 实现选择：管理网页与用户端一样用 Vue 3；API 用 Node.js ESM；新仓库用 npm workspaces；本地环境文件 gitignore；不提交旧密钥。
- 已确认（用户）：管理端不用 `Secure` Cookie 来强制 HTTPS；反向代理终止 TLS 后，浏览器看到 HTTPS 时再加 `Secure` 即可，不要求 Node 自己提供 HTTPS。
- 已确认（用户）：平台后台与域后台互不挤下线；平台最多 3 处同时在线，域最多 3 处；超出则挤掉该后台最旧的一处。小程序会话仍独立。
- 已确认（用户）：同一浏览器同一后台的多个标签共用一份登录。管理端用 HttpOnly Cookie（`SameSite=Lax`，本地先不开 `Secure`），不再把令牌只放在 `sessionStorage`。

# Open questions

无。

# Verification expectations

- 核对本仓库出现四套正式工程骨架，且实验目录仍标明非正式。
- 核对新库 `vflie` 只有新表和预置汽车验证域种子；不核验旧库 `vcar`。
- 核对正式小程序锁浅色且深色源仍在；没有 JS 涂色。
- 核对首位平台运营者可从标明用途的配置产生；管理密码登录与小程序微信登录都指向同一平台账号模型。
- 不运行旧项目业务测试，不把实验探针验收写成正式小程序验收。
- 本轮实现完成后先停，等用户审查，再进入 Native Verify。
