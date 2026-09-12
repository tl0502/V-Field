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

密钥只放在被 gitignore 的 `apps/api/.env`。复制 `apps/api/.env.example` 填写。清空数据库需要 `ALLOW_DB_RESET=1`，然后 `npm run db:reset` 与 `npm run bootstrap`。

## 工作区关系

本目录 `D:\Project\WECHAT-PROJECT-next` 拥有独立 Git 仓库和 COMET 状态。旧项目 `D:\Project\WECHAT-PROJECT` 保留作参考；不修改其源码或 `.env`。P2 按用户确认复用旧项目正在使用的 PostgreSQL，并对其执行一次清空后写入新表。
