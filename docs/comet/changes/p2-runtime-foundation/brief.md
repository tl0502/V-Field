# Outcome

为 v域新版建立 P2 最小运行与权限基础：在本仓库落地四套正式工程骨架，复用旧项目正在使用的 PostgreSQL 数据库并执行一次清空，按 P1 实体合同写入空表，并提供可验证的最小身份与鉴权。本 change 不把 `experiments/p1-uniapp-probe/` 升级为正式小程序，也不交付指定域运营者、入域审批、发布或阅读。

用户本轮确认：骨架 + 空库 + 最小身份/鉴权；本仓库四套工程；服务端采用旧候选 Node.js + PostgreSQL；数据库复用旧项目数据库并执行一次清空；完成这部分后停下供审查。

# Scope

- 在当前仓库建立正式工程骨架，目录为 `apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`。用户端 uni-app + Vue 3 只编译微信小程序；两套管理端为独立 Vue 3 网页；API 为自建 Node.js 服务。
- 复用旧项目 `D:\Project\WECHAT-PROJECT\apps\api\.env` 中 `DATABASE_URL` 所指向的 PostgreSQL 数据库（调查结果：主机 `199.85.8.5`，库名 `vcar`）。对该库执行一次清空（`DROP SCHEMA public CASCADE` 后重建 `public`），再写入本 change 的新空表。不迁移旧行。不修改旧项目源码、Git 状态或 `.env` 文件。
- 按 P1 实体合同设计并实现最小物理表：平台账号、微信身份、业务域（预置汽车验证域）、域成员、入域申请、平台/域运营者资格、管理凭证、会话。不把内容表、消息表或媒体表当成已交付。
- 提供可验证的正式身份与鉴权：标明用途的初始化配置产生首位平台运营者；管理端用同一平台账号的管理登录名 + 管理密码登录；小程序微信登录产生平台账号。真实授权不使用开发令牌。
- 微信用户端外观继续只跟随系统；正式小程序使用 `darkmode` / `theme.json` / 各页组件自己的 `prefers-color-scheme`，不用 JS class 或 `setBackgroundColor` 涂色。
- 本轮实现完成后停下，等用户审查，再进入后续验收或 P2 其余能力。

## Source coverage

| ID | 来源定位与单元 | 读取状态 | 保留语义 | Spec 位置 | 验收 ID | 覆盖状态 | 理由或替代关系 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 用户：归档 P1 并开 P2；问框架是否已搭建、P2 第一项工作 | complete | 启动 P2；正式工程尚未搭建，第一项是骨架 | Requirement: 正式工程骨架 | A1 | covered | 仓库根无正式 `package.json` / `apps/` |
| S2 | `docs/project/rebuild-plan.md`：P2 最小运行与权限基础 | complete | 空数据环境、身份、归属、鉴权；后续不再用临时开发身份 | Requirement: 最小身份与鉴权 | A2 | covered | 本 change 做到登录与资格表，不做到发布 |
| S3 | `docs/project/product-rules.md`：概念实体与归属 | complete | 实体合同已冻结；P2 设计物理表，不沿用旧表 | Requirement: 空库与物理表 | A3 | covered | 清空后按新合同建表 |
| S4 | 同文件：首期闭环所需身份与权限 | complete | 指定运营者、申请、审批依赖真实账号与角色 | Requirement: 最小身份与鉴权 | A2 | covered | 本轮交付登录与初始化，不交付指定/审批界面 |
| S5 | 同文件：技术选型 | complete | uni-app + Vue 3 仅微信；自建 API；两套管理网页 | Requirement: 技术栈与目录 | A4 | covered | 用户确认采用 Node.js + PostgreSQL |
| S6 | `docs/project/feasibility.md`：实验不能当 P2 基础 | complete | 另建正式工程；探针只作 Dark Mode 参考 | Requirement: 正式工程骨架 | A1 | covered | 已归档 P1 |
| S7 | 同文件：微信端只跟随系统 | complete | 正式小程序沿用官方 Dark Mode 链路 | Requirement: 微信端跟随系统 | A5 | covered | 工程约束 |
| S8 | P0/P1：本阶段不清理旧库，建独立空库 | complete | 已被本轮用户决定替代 | 不适用 | 不适用 | superseded | 由 S9 替代 |
| S9 | 用户本轮：复用旧项目数据库并执行一次清空 | complete | 复用旧 `DATABASE_URL` 指向的库；一次清空；不迁旧数据；不改旧仓库文件 | Requirement: 复用旧库并一次清空 | A6 | covered | 调查到主机 `199.85.8.5`、库 `vcar`、13 张旧表 |
| S10 | 用户本轮：完成骨架+空库+最小身份/鉴权后停下审查 | complete | 本轮交付到该切片即停 | Requirement: 本轮停止点 | A7 | covered | 审查后再 Verify 或继续 |
| B1 | 仓库根现状：无正式 package.json/apps/src/API | complete | 框架规范尚未搭建 | Requirement: 正式工程骨架 | A1 | background | 可调查事实 |
| B2 | 旧库只读调查：`vcar` 现有 13 张 public 表 | complete | 清空会删除这些旧表及行 | Requirement: 复用旧库并一次清空 | A6 | background | 清空前写入规格，供用户确认 |

# Non-goals

- 不交付指定域运营者界面、入域申请/审批、内容发布、列表/详情阅读、发现、消息、资料编辑或自定义 tabBar 业务。
- 不把 `experiments/p1-uniapp-probe/` 改成正式小程序，不把它当作 P2 基础。
- 不迁移旧账号或业务数据；清空后的库按新合同从空表开始。
- 不修改旧项目 `D:\Project\WECHAT-PROJECT` 的源码、Git 状态、`.env` 或运行配置文件。
- 不把网页微信扫码登录写成已开通；管理端本轮仍是登录名 + 管理密码。
- 不在微信端做应用内强制浅色/深色。
- 不在本轮接入 S3/对象存储，不恢复头像上传。
- 不把旧 `X-Dev-Token` 或旧表结构当作新版授权或表设计。

# Acceptance examples

- A1: 仓库中存在正式工程 `apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`，能在清空后的数据库上本地启动；`experiments/p1-uniapp-probe/` 仍标明为实验，且不是该骨架的拷贝升级。
- A2: 可以用正式身份完成：初始化首位平台运营者；管理密码登录识别为该运营者；小程序微信登录产生平台账号。没有开发令牌作为生产授权。
- A3: 物理表覆盖平台账号、微信身份、业务域、域成员、入域申请、运营者资格、管理凭证与会话；预置汽车验证域作为空数据种子存在。没有把内容发布表或旧库表写成已完成的 P2 交付。
- A4: 服务端为 Node.js + PostgreSQL；四套工程位于本仓库上述目录；连接串与密钥只出现在 gitignore 的本地环境文件，不把旧项目 `.env` 提交进新仓库。
- A5: 正式小程序开启官方 Dark Mode（`darkmode` + `theme.json` + 页面/组件内 `prefers-color-scheme`），没有 JS 涂色作为主题机制。
- A6: 对旧项目 `DATABASE_URL` 指向的数据库执行一次清空后，该库不再保留旧表和旧行，只存在本 change 的新空表；旧项目工作区文件未被修改。
- A7: 本轮交付止于骨架、空库与最小身份/鉴权；指定域运营者、入域审批、发布和阅读仍标明未交付。

# Constraints and invariants

- P1 已归档：角色不能合并；内容必须同时有作者和业务域；发布是域成员权；访客可读已发布公开字段。本轮不实现发布/阅读，但表和身份模型不得与该合同冲突。
- 新版从空数据开始。首位平台运营者来自标明用途的初始化配置。
- 旧 Node.js + PostgreSQL 按新合同重写后采用；S3 本轮不采用。
- 复用旧数据库实例不等于复用旧表、旧行、旧密钥文件或旧 Runtime。
- 正式工程不得把实验探针的页面、依赖或测试 AppID 当作默认业务基础。
- Runtime 状态由 COMET 管理；正式需求只写在本 brief 与完整目标 Spec。

# Decisions

- 已确认（用户）：归档 P1，立即开始 P2 Native change `p2-runtime-foundation`，隔离方式为当前目录 `main`。
- 已确认（事实）：仓库根没有正式 `package.json` / `apps/` / API / 管理端；P2 第一项实现工作是搭建正式工程框架。
- 已确认（P1）：用户端 uni-app + Vue 3 只编译微信；两套管理网页；微信端只跟随系统。
- 已确认（用户，Q1）：本 change 交付骨架 + 空库 + 最小身份/鉴权。指定域运营者、入域审批、发布/阅读不在本轮。
- 已确认（用户，Q2）：四套工程放在本仓库：`apps/miniprogram`、`apps/api`、`apps/admin-platform`、`apps/admin-domain`。
- 已确认（用户，Q3）：服务端采用旧候选 Node.js + PostgreSQL，按新合同重写。
- 已确认（用户）：数据库复用旧项目正在使用的 PostgreSQL；执行一次清空。调查结果写入规格：`199.85.8.5:5432/vcar`，当前 13 张旧表。清空方式为删除并重建 `public` schema，再写入新表。不修改旧仓库文件。
- 已确认（用户）：完成上述切片后停下，供用户审查。
- 实现选择：管理网页与用户端一样用 Vue 3；API 用 Node.js ESM；新仓库用 npm workspaces；本地环境文件 gitignore；不提交旧密钥。

# Open questions

无。

# Verification expectations

- 核对本仓库出现四套正式工程骨架，且实验目录仍标明非正式。
- 核对旧项目文件未被修改；被复用的数据库在一次清空后只有新空表和预置汽车验证域种子。
- 核对首位平台运营者可从标明用途的配置产生；管理密码登录与小程序微信登录都指向同一平台账号模型。
- 不运行旧项目业务测试，不把实验探针验收写成正式小程序验收。
- 本轮实现完成后先停，等用户审查，再进入 Native Verify。
