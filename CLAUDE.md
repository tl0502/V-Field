<comet-ambient-resume>
<!-- Managed by Comet. Edits inside this block may be replaced by comet init/update. -->
<!-- Contract: comet.resume_probe.v2 -->

## Comet Ambient Resume

在这个仓库中，开始处理需要改动或调查的任务前，如果可能存在活跃 Comet workflow，把当前用户请求传入只读探针：`comet resume-probe . --stdin --json`。

- 如果用户通过宿主明确调用任意 Comet Skill（例如 `@comet`、`/comet`、`@comet-native` 或 `/comet-hotfix`），显式调用优先于本恢复协议；不要运行 resume probe，直接进入被调用的 Skill。
- 如果用户通过宿主明确调用的是非 Comet 的 Skill 或斜杠命令，任务意图已由该调用明确：不要运行 resume probe，直接执行该 Skill。
- 如果你正在 Comet 流程内（包括正在等待用户回复你在流程中提出的问题），不要运行 resume probe；把这类回复（例如方案/选项选择）当作当前 change 的继续，直接按用户的选择推进。
- 只信任返回的 `workflow`、`skill` 和 `entrySource`；它们只由项目配置或无配置兼容回退决定。不得扫描或切换另一套 workflow。
- 如果 probe 返回 `auto_resume`，简短说明选中的 active change，并进入 `nextCommand` 指向的永久入口。不要把状态命令当作恢复入口直接推进。
- 如果 probe 返回 `ask_user`，只问一个简短问题并等待用户回复。
- 如果当前请求未明确调用 Comet Skill，且 probe 返回 `out_of_scope` 或 `none`，不要进入 Comet workflow。
- `out_of_scope` 或 `none` 只表示不要因为这个新请求进入 Comet workflow；它绝不表示要暂停或退出一个已在进行的 Comet 流程。
- 如果配置或状态无效且没有 `nextCommand`，停止并报告原因；不要猜测另一个 workflow。
- 不能只因为存在 active change 就把无关任务挂到该 change。Native 的未提交改动由 Native 入口检查，不由探针自动归因。
</comet-ambient-resume>

<project-rebuild-context>

## 独立新版工作区

本目录是 v域的独立新版。用户已选择「独立新版分阶段重建」，先明确整体重建边界、复用范围、阶段依赖和验收，再推进具体业务实现。

先读 `docs/project/overview.md`，正式工作按当前 Native change 的 brief、完整目标规格及 Runtime 状态推进。不要用旧项目的代码状态、文档中的已确认标签或旧测试断言替代新版需求。

旧项目 `D:\Project\WECHAT-PROJECT` 仅作按需参考；复用前核对与新目标的适配及风险，并在新版重新验证。旧项目的环境变量、密钥、数据库和 Runtime 状态不属于可直接复制的模板内容。

用户已确认主题需要浅色、深色、跟随系统三档；用户报告过 Android 真机与开发工具的主题不一致，iOS 未测试。这是新版需求及验收线索，不代表根因已经复现，也不自动决定首个业务开发任务。

数据保留与迁移、首个交付范围以及各模块的具体规则，需要在整体规划中明确。未确认的数据处理保持旧环境原样。业务代码只在对应 Native change 完成需求确认后实施。

本项目的文档检索仅主动加入新方向概览；旧审查材料不加入新版语料。不得把旧项目测试通过结果写成新版验收结果。

</project-rebuild-context>
