# v域 · 独立新版

本工作区采用「独立新版分阶段重建」路线，以微信小程序为产品端，面向跨行业信息社区：平台提供通用能力，外部运营者经营业务域，内容使用平台提供的 Block，汽车作为首个验证场景。

## 入口

- [已确认方向与重建边界](docs/project/overview.md)
- [整体重建规划与功能恢复清单](docs/project/rebuild-plan.md)
- 首条 Native change：`plan-staged-rebuild`，用于整体重建规划，不是主题或编辑器的实现任务。
- Codex 入口：`AGENTS.md`；Claude Code 入口：`CLAUDE.md`。

在本目录运行 `comet.cmd status . --json` 查看实际进度。正式 brief、完整目标规格和 Runtime 状态位于 `docs/comet/changes/`；只有通过 Native 验收和归档的规格才进入正式基线。

## 工作区关系

本目录 `D:\Project\WECHAT-PROJECT-next` 拥有独立 Git 仓库和 COMET 状态。旧项目 `D:\Project\WECHAT-PROJECT` 保留作参考及回退依据；本地 COMET 模板来自 `D:\Project\开发流XXXXX`。

业务代码按新目标分阶段实现；符合新边界的旧模块可在评审和新版验证后复用。启动时只安装了协作工具和新方向说明，没有把旧应用、旧数据或旧环境配置带入新仓库。
