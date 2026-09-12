# P2 最小运行与权限基础

本规格定义独立新版 P2 本轮应交付的正式工程骨架、复用旧库后的空数据环境、最小物理表，以及可验证的身份与鉴权。它不表示指定域运营者、入域审批、发布或阅读已经可运行。

## 目的

在 P1 产品合同之后，把可运行的工程目录、数据库和正式身份落到新仓库，使后续首期闭环可以依赖真实账号与权限，而不再使用开发令牌或实验探针。

## Requirements

### Requirement: 正式工程骨架

在 `D:\Project\WECHAT-PROJECT-next` 建立四套正式工程，使用 npm workspaces：

| 目录 | 职责 |
| --- | --- |
| `apps/miniprogram` | uni-app + Vue 3，只编译微信小程序 |
| `apps/api` | 自建 Node.js HTTP API，连接 PostgreSQL |
| `apps/admin-platform` | 平台级管理网页 |
| `apps/admin-domain` | 域级管理网页 |

`experiments/p1-uniapp-probe/` 保持实验标记，不作为正式小程序的拷贝升级来源。正式小程序可以参考其 Dark Mode 写法，但使用独立工程与独立页面。本轮小程序和管理端只需要身份骨架（登录与当前身份展示），不要求恢复完整旧业务页。

每套工程都有可重复的本地启动方式，并在空库上能够启动。API 默认监听本机端口，避免必须占用旧项目正在使用的进程才能验收。

#### Scenario: 四套正式工程可识别且探针仍是实验

- GIVEN 本 change 的实现已经落在新仓库。
- WHEN 查看仓库根与 `apps/`、`experiments/`。
- THEN 能看到上述四套正式工程；`experiments/p1-uniapp-probe/` 仍标明为实验；正式小程序不是该探针目录的重命名或原地升级。

### Requirement: 技术栈与目录

服务端采用 Node.js + PostgreSQL，按本规格重写，不复制旧 API 源码作为正式基础。管理端与用户端均使用 Vue 3。连接串、微信 AppSecret、管理端引导密码只存在于被 gitignore 的本地环境文件；`.env.example` 只含占位符。

允许新仓库的本地 `.env` 填写与旧项目相同的 `DATABASE_URL` 和微信 AppID/Secret，以便连接被复用的数据库。禁止把旧项目 `.env` 文件拷进 Git，也禁止在正式源码中硬编码密钥。

不在本轮接入 S3 或对象存储。

#### Scenario: 栈与密钥隔离符合确认

- GIVEN 读者或检查核对本仓库的技术栈与环境文件。
- WHEN 对照已确认决定。
- THEN 四套工程位于本仓库 `apps/` 下；API 为 Node.js 并使用 PostgreSQL；仓库中没有提交旧项目 `.env` 或明文密钥；S3 没有被写成已交付。

### Requirement: 复用旧库并一次清空

数据库复用旧项目 `apps/api/.env` 的 `DATABASE_URL` 所指向的实例。Shape 调查结果（只读）：主机 `199.85.8.5`，端口 `5432`，库名 `vcar`，用户 `vcar`。当时 `public` 中有 13 张旧表，包括 `users`、`wechat_identities`、`auth_sessions`、`vehicle_sheets` 等，并有旧行。

本 change 对该库执行一次清空，操作为：

1. `DROP SCHEMA public CASCADE;`
2. `CREATE SCHEMA public;`
3. 把当前数据库用户需要的 `public` 权限补回；
4. 再运行本仓库的迁移，写入新空表和预置种子。

清空删除旧表和旧行，不保留旧 `schema_migrations`，不导入旧账号。不清空 PostgreSQL 实例上的其他数据库，不删除数据库角色本身。

旧项目工作区保持只读：不修改其源码、Git 状态、`.env`、docker-compose 或运行配置文件。P0「不得改写旧项目文件」仍然有效；P0「本规划不连接或清理旧库」被本 change 的用户决定替代，且仅限这一次针对上述数据库的清空。

提供可重复的 API 命令执行该清空并迁移。本轮只实际执行一次。

#### Scenario: 一次清空后旧行消失且旧仓库文件未改

- GIVEN 实现使用旧项目 `DATABASE_URL` 指向的数据库，并且已经执行本 change 的一次清空与迁移。
- WHEN 核对该库的 `public` 表，并核对该旧项目工作区文件是否被修改。
- THEN 该库不再存在旧版 `users` / `vehicle_sheets` 等表及其行；只存在本规格的新表；旧项目源码与 `.env` 文件内容与清空前一致。

### Requirement: 空库与物理表

物理表按 P1 实体合同设计，不沿用旧表名作为新版合同。本轮批准的表如下。

| 表 | 对应实体 | 关键约束 |
| --- | --- | --- |
| `platform_accounts` | 平台账号 | 主键 UUID；状态 `active` / `disabled` |
| `wechat_identities` | 微信身份 | 绑定一个平台账号；`(app_id, openid)` 唯一 |
| `business_domains` | 业务域 | `slug` 唯一；预置 `auto-verify`（汽车验证域） |
| `domain_memberships` | 域成员 | 平台账号 × 业务域；状态含 `active` |
| `domain_join_requests` | 入域申请 | 申请者 × 目标域；状态 `pending` / `approved` / `rejected` |
| `platform_operator_grants` | 平台运营者资格 | 授予平台账号；首位来源 `bootstrap` |
| `domain_operator_grants` | 域运营者资格 | 授予平台账号并绑定具体业务域 |
| `admin_credentials` | 管理凭证 | 绑定已有平台账号；`login_name` 唯一；保存密码哈希 |
| `auth_sessions` | 会话 | 绑定平台账号；区分 `miniprogram` 与 `admin` 受众；`token_hash` 唯一 |

迁移后种子：插入预置业务域 `slug=auto-verify`、名称表示汽车验证域。本轮不指定域运营者，不创建域成员，不写入入域申请。

禁止在本轮把内容、内容 Block、消息、关注、头像资源表写成已交付。

#### Scenario: 新表覆盖身份与域实体且不含内容表

- GIVEN 清空后的迁移已经执行。
- WHEN 列出 `public` 用户表。
- THEN 能看到上表所列实体表，以及预置汽车验证域种子行；看不到作为本轮交付的内容发布表或旧 `vehicle_sheets` 表。

### Requirement: 最小身份与鉴权

同一套平台账号同时服务小程序与两套管理网页。

首位平台运营者由标明用途的初始化配置产生，配置项至少包括管理登录名与管理密码。初始化命令在库中尚无平台运营者时创建：一个 `active` 平台账号、一条 `platform_operator_grants`、一条 `admin_credentials`。已存在平台运营者时不得静默覆盖密码或重复授予。

管理端登录：`POST` 管理登录接口，使用 `login_name` + 密码，校验管理凭证后签发 `audience=admin` 的会话。成功后的当前用户必须能识别为该平台运营者。未登录或密码错误不得获得运营者能力。

小程序登录：`POST` 微信登录接口，使用微信 `jscode2session` 换取 `openid`。已有绑定则更新最近登录时间；没有则创建平台账号并绑定微信身份，签发 `audience=miniprogram` 的会话。微信配置缺失时返回明确错误，不得用开发令牌顶替。

`GET` 当前用户接口按会话返回平台账号及已授予角色。`POST` 注销使当前会话失效。

禁止提供 `X-Dev-Token` 或等价开发令牌作为生产授权。

本轮管理页和小程序页只验收登录与当前身份展示，不验收指定域运营者或审批入域。

#### Scenario: 初始化平台运营者后管理密码登录成功

- GIVEN 空库已迁移，并且已经用标明用途的配置执行初始化。
- WHEN 使用该配置中的登录名和密码调用管理登录，再读取当前用户。
- THEN 返回的平台账号持有平台运营者资格；没有使用开发令牌。

#### Scenario: 小程序微信登录产生平台账号

- GIVEN 微信登录配置可用，或测试中使用可注入的微信客户端替身。
- WHEN 使用尚未绑定的微信身份调用小程序登录。
- THEN 创建平台账号和微信身份绑定，并返回小程序会话；该账号不会仅仅因为登录就成为域成员或域运营者。

#### Scenario: 开发令牌不能作为正式授权

- GIVEN API 已经按本规格运行。
- WHEN 只携带旧式开发令牌、不携带正式会话访问需要身份的接口。
- THEN 请求被拒绝；系统没有把开发令牌当作生产授权。

### Requirement: 微信端跟随系统

正式小程序开启官方 Dark Mode：`darkmode: true`，`themeLocation: "theme.json"`，窗口与 tabBar 颜色使用 `@` 变量。页面和自定义组件的业务颜色使用直接属性 + `@media (prefers-color-scheme: dark)`。禁止用 JS class、`setBackgroundColor` 或 `setTabBarStyle` 作为主题机制。`onThemeChange` 若存在，只更新非样式状态。

本轮不把系统切换是否仍闪色写成已经消除；闪色若仍存在，记为客户端限制，不得再加一层 JS 强制涂色。

#### Scenario: 正式小程序使用官方 Dark Mode 链路

- GIVEN 正式小程序工程已经创建。
- WHEN 检查 `manifest` / `theme.json` / 页面与组件样式，以及源码中的主题相关 API。
- THEN 官方 Dark Mode 已开启且窗口色来自主题变量；业务深色规则写在媒体查询里；没有 JS 涂色作为主题机制。

### Requirement: 本轮停止点

本轮交付止于：四套骨架、一次清空后的空库、最小身份与鉴权。用户将先审查这些结果。

指定预置汽车验证域的域运营者、入域申请与审批、内容发布、访客阅读不在本轮验收为已完成。相关表可以为后续 P2/P3 预留，但不能把空表或占位按钮写成这些能力已经交付。

#### Scenario: 本轮未把发布闭环写成已完成

- GIVEN 读者核对本轮交付说明和可运行界面。
- WHEN 寻找指定域运营者、入域审批、发布或阅读。
- THEN 这些能力被标明未交付；本轮可验证的是骨架、空库和登录/身份。
