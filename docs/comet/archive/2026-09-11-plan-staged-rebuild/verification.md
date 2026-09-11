---
generated_from_state_version: 21
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 3
- 迭代: 1
- 验证器尝试次数: 1
- 完成时间: 2026-09-11T07:26:23.740Z
- 摘要: 独立全量验收 A1–A16 通过。已核对 stateVersion 18、当前候选及原始日志前缀 e2f01b11-2353-43fb-9ee1-390ea4453149；git-whitespace、comet-health、workspace-documents、knowledge-sources、ui-design-knowledge 均 passed、exitCode 0。知识检索仅命中新版规划与概览，diagnostics 为空。旧 UI 优先复用要求完整落入规划和后续 P1 边界，其余既有规划语义保持一致。结论仅适用于规划交付，不代表页面视觉还原、业务或真机验收；本执行未写文件、推进 Runtime、连接数据库或启动业务。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1: 新版工作区有独立 Git 根和可用的 Codex/Claude Code COMET 接入；旧项目的 Git HEAD、既有改动状态和核对文件内容保持原样。 | 新版 Git 根独立；本轮 workspace-documents 原始证据确认旧 HEAD、既有改动状态及 7 个基线文件哈希未变。comet-health 确认 Codex、Claude Code 的项目级 skills、rules、hooks 和运行脚本可用。 |
| A2 | passed | brief.md | A2: 用户可以通过一份完整规划判断主要模块的重建与候选复用边界、阶段依赖、三档主题需求和后续需确认的业务问题；不存在把旧实现或候选建议写成已批准新版规则的情况。 | rebuild-plan.md 完整覆盖功能恢复、重建与候选复用边界、P0–P4 依赖、三档主题和后续业务决定；候选阶段及旧实现没有被写成已批准的新业务规则。 |
| A3 | passed | brief.md | A3: 规划验收完成后只代表规划交付；工作区和状态不会显示主题、账号或其他业务实现已经完成，后续实施由各自的 Native change 承接。 | 规划、README、brief 和完整 Spec 均区分规划交付与业务交付；当前仅有规划 change，文件清单没有业务源码，后续实施明确由对应 Native change 承接。 |
| A4 | passed | brief.md | A4: 规划明确新版不迁移旧账号和业务数据、从空数据开始；不安排迁移里程碑，不把用户决定推断为旧库只有测试数据；旧数据清理的目标与执行证据尚未形成时，不报告已经清理。 | 规划明确不迁移旧账号、会话或业务数据，新版从空数据开始；没有迁移里程碑，不推断旧数据性质，并明确实际清理尚未执行。 |
| A5 | passed | brief.md | A5: 旧功能清单覆盖原实现审查中的功能组，逐项区分已实现、部分实现与占位，给出恢复目标、阶段候选和验收关注点；功能原则上全部保留，阶段后置不等于删除，任何范围例外须在对应需求中明确确认。 | 对照旧 implementation.md，F01–F12 及治理说明覆盖原审查功能组，区分已有代码、部分实现和占位，均保留恢复目标、阶段候选及验收关注点；范围缩减须明确确认。 |
| A6 | passed | brief.md | A6: 规划、概览和双平台入口明确旧 UI 设计优先复用，区分布局/视觉/主要交互与底层代码；P1 对照用户流程记录旧页面的复用与必要适配，影响设计的调整有依据和确认边界，不能默认整套改版。 | 规划的「旧 UI 设计优先复用」章节、概览及 AGENTS/CLAUDE 双入口一致要求旧 UI 优先复用，并区分设计与底层代码。P1 要求流程对应旧页面；影响视觉方向、页面结构或主要交互的调整须说明原因、方案并确认。 |
| A7 | passed | specs/rebuild-plan/spec.md | 检查新版初始化的隔离范围 - GIVEN 独立新版工作区已经建立。 - WHEN 核对两个工作区的 Git 根、当前状态和新版文件清单。 - THEN 两个 Git 根不同，旧项目既有状态保持原样，新版没有导入旧应用源码、环境密钥或旧工作流执行状态。 | 当前新版文件清单仅含协作工具、配置和规划产物；无旧应用、环境密钥或旧项目执行状态导入。当前选择为 native:plan-staged-rebuild，旧工作区保护检查通过。 |
| A8 | passed | specs/rebuild-plan/spec.md | 审查每个模块的去向 - GIVEN 用户已确定旧功能原则上全部保留、分阶段恢复。 - WHEN 审查最终模块清单。 - THEN 每个模块都有明确的功能目标、重建或候选复用边界、阶段位置及理由；旧功能不会因后置而从范围消失，旧测试通过、旧文档标签和旧页面布局不会代替新版验收。 | 功能表和复用表给出各模块目标、实现边界、阶段位置及依赖理由；后置功能持续登记，旧测试、文档标签和页面布局均不能替代新版验收。 |
| A9 | passed | specs/rebuild-plan/spec.md | 将认可的旧 UI 作为设计基线 - GIVEN 用户明确认可旧 UI 设计，并要求新版尽量复用。 - WHEN 审阅整体规划、概览、双平台入口及 P1 的交付范围。 - THEN 旧布局、视觉和主要交互被列为优先复用基线，UI 设计与底层实现分开判断；用户流程需要对照旧页面，必要适配有依据及确认边界，不会把独立重建解释为默认整套视觉改版。 | 新增 UI Requirement、S10 来源映射与规划、概览、双入口和 P1 一致：认可的旧布局、视觉及主要交互是优先基线，架构重写不授权整套改版。本轮 ui-design-knowledge 原始日志实际命中该章节。 |
| A10 | passed | specs/rebuild-plan/spec.md | 追踪旧功能是否被完整保留 - GIVEN 旧功能原则上全部保留，且旧实现中同时存在可用功能、部分实现和占位。 - WHEN 将旧实现审查与规划中的恢复清单逐组对照。 - THEN 每组都有恢复目标、旧版完成度和阶段候选；后置项仍在范围中，旧数量限制和接口不被自动固定，未完成链路也不被写成新版已交付；发现遗漏后补入清单。 | 旧账号、资料、联系方式、申请、徽章认证、内容编辑阅读、发现导航、消息关系、媒体及域运营功能组均有恢复去向；未完成链路如实登记，旧数量限制及接口不自动成为新版细则，遗漏要求补入。 |
| A11 | passed | specs/rebuild-plan/spec.md | 检查阶段依赖是否尊重基础约束 - GIVEN 规划已经列出阶段目标。 - WHEN 沿依赖关系检查任何真实发布或管理操作。 - THEN 身份、资源归属、权限和数据合同位于相应业务操作之前或同一可验证闭环之内；探索原型被明确标记，不被当作已经完成的正式基础。 | P1 明确角色、归属、权限和数据规则，P2 建立可验证基础，P3 才形成业务闭环；真实发布或管理所需基础须先完成或在同一闭环验证，探索原型不能计为正式基础。 |
| A12 | passed | specs/rebuild-plan/spec.md | 单项痛点不自动决定项目顺序 - GIVEN 已确认三档主题需求与旧版主题体验问题。 - WHEN 审查阶段规划和第一项业务任务的决定来源。 - THEN 主题作为基础需求和风险存在，不能仅因该痛点已被描述就宣布它是第一项业务任务；实际任务选择具有整体范围与用户目标依据。 | F10、阶段说明、概览和 Spec 均保留主题需求及可行性风险，同时明确不据此自动指定第一项业务任务；首期流程与阶段内部顺序由后续整体目标及依赖确定。 |
| A13 | passed | specs/rebuild-plan/spec.md | 判断一个旧模块是否可以复用 - GIVEN 有一个旧技术组件或业务模块被列为候选。 - WHEN 决定采用该候选。 - THEN 记录其与新边界的适配和风险，并在新版重新验证；没有把旧环境凭据、历史工作流状态或旧通过结果当作复用的组成部分。 | 复用要求记录来源版本、用途、新旧规则和接口差异、修改部分、风险及新版验证；明确排除旧凭据、连接配置、历史工作流状态和旧通过结果。 |
| A14 | passed | specs/rebuild-plan/spec.md | 区分空数据起步的决定与清理执行 - GIVEN 用户明确选择不迁移并清空数据。 - WHEN 审阅新版数据策略和当前执行状态。 - THEN 规划明确旧账号和业务数据不迁入新版、新版从空数据开始；没有迁移里程碑，也没有把旧库的数据性质当作已知事实；实际清理在目标和核验记录形成前保持未执行，不报告已经清空。 | 空数据策略明确区分用户清理决定与执行事实，禁止把旧数据导入包装为初始化；实际清理待定位数据库、环境、存储及核验依据后另行执行，当前未宣称已清空。 |
| A15 | passed | specs/rebuild-plan/spec.md | 区分需求、用户报告与实际验证 - GIVEN 用户确认了主题三档并描述了旧版体验问题。 - WHEN 阅读规划中的主题范围与验证计划。 - THEN 三档需求被保留，根因与原生控制能力没有被假定为已证实，iOS 也没有被计为已验证通过。 | 三档主题完整保留，Android/开发工具问题标为用户报告，根因和原生界面控制能力待验证，iOS 明确未测试，没有新增真机通过结论。 |
| A16 | passed | specs/rebuild-plan/spec.md | 正确解释当前阶段的完成 - GIVEN 整体规划后续通过验收。 - WHEN 用户查看当前产物与进度。 - THEN 能区分规划已交付与业务尚未实现，且不会发现未经确认就已经执行的主题、登录、编辑器或数据库迁移任务。 | README、规划和 Runtime 对应的交付对象均为整体规划；当前无主题、登录、编辑器、数据库迁移等业务实现产物或任务完成声明，后续业务仍须分别确认和验收。 |

## 检查

| 检查 | 命令 | 工作目录 | 状态 | 退出码 | 耗时 |
| --- | --- | --- | --- | ---: | ---: |
| Git whitespace check | diff --check | . | passed | 0 | 86 ms |
| Comet project integrations | -NoProfile -Command comet.cmd doctor . --scope project --json; exit $LASTEXITCODE | . | passed | 0 | 1997 ms |
| Workspace isolation and document references | -NoProfile -Command $ErrorActionPreference = 'Stop' $taskBaseline = Get-Content -LiteralPath 'D:\Project\WECHAT-PROJECT-information-review\20260910\rebuild-bootstrap\bootstrap-validation.json' -Raw \| ConvertFrom-Json $taskLegacyRoot = $taskBaseline.legacyBefore.Root $taskHead = git -C $taskLegacyRoot rev-parse HEAD if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect legacy HEAD' } $taskStatus = @(git -C $taskLegacyRoot status --short) if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect legacy status' } if ($taskHead -ne $taskBaseline.legacyBefore.Head) { throw 'Legacy HEAD changed' } if (($taskStatus -join [Environment]::NewLine) -cne ($taskBaseline.legacyBefore.Status -join [Environment]::NewLine)) { throw 'Legacy status changed' } foreach ($taskFile in $taskBaseline.legacyBefore.Files) { if ((Get-FileHash -LiteralPath (Join-Path $taskLegacyRoot $taskFile.Path) -Algorithm SHA256).Hash -ne $taskFile.SHA256) { throw ('Legacy file changed: ' + $taskFile.Path) } } $taskNewRoot = git rev-parse --show-toplevel $taskOldRoot = git -C $taskLegacyRoot rev-parse --show-toplevel if ($taskNewRoot -eq $taskOldRoot) { throw 'Git roots are not isolated' } if ((Get-FileHash -LiteralPath 'AGENTS.md').Hash -ne (Get-FileHash -LiteralPath 'CLAUDE.md').Hash) { throw 'Host instructions differ' } foreach ($taskBusinessPath in @('apps','packages','src','package.json','.env')) { if (Test-Path -LiteralPath $taskBusinessPath) { throw ('Unexpected business path: ' + $taskBusinessPath) } } $taskDocs = @('README.md','AGENTS.md','CLAUDE.md','docs/project/overview.md','docs/project/rebuild-plan.md','docs/comet/changes/plan-staged-rebuild/brief.md','docs/comet/changes/plan-staged-rebuild/specs/rebuild-plan/spec.md') foreach ($taskDoc in $taskDocs) { $taskAbs = (Resolve-Path -LiteralPath $taskDoc).Path $taskText = Get-Content -LiteralPath $taskAbs -Raw if ($taskText -match '(?m)^(<<<<<<<\|=======\|>>>>>>>)' -or $taskText -match '(?m)[\t ]+\r?$') { throw ('Document hygiene failure: ' + $taskDoc) } foreach ($taskLink in [regex]::Matches($taskText, '\]\(([^)]+)\)')) { $taskTarget = $taskLink.Groups[1].Value if ($taskTarget -match '^(https?://\|#\|/)') { continue } $taskRelative = ($taskTarget -split '#')[0] if ($taskRelative -and -not (Test-Path -LiteralPath (Join-Path ([System.IO.Path]::GetDirectoryName($taskAbs)) $taskRelative))) { throw ('Unresolved document link: ' + $taskDoc + ' -> ' + $taskTarget) } } } [pscustomobject]@{legacyHeadUnchanged=$true;legacyStatusUnchanged=$true;legacyFileHashesChecked=$taskBaseline.legacyBefore.Files.Count;gitRootsIndependent=$true;hostInstructionsMatch=$true;businessPathsAbsent=$true;documentsChecked=$taskDocs.Count} \| ConvertTo-Json | . | passed | 0 | 796 ms |
| Authoritative plan knowledge lookup with explicit UTF-8 | -e const {spawnSync}=require('node:child_process'); const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_global/node_modules/@rpamis/comet/bin/comet.js','knowledge','query','.', '--task','独立新版重建规划 功能恢复清单 F01 F12 原则上全部保留 不迁移 空数据','--phase','verify','--json'],{encoding:'utf8',windowsHide:true,timeout:55000,maxBuffer:8*1024*1024}); if(r.error) throw r.error; if(r.status!==0){process.stderr.write(r.stderr\|\|'Knowledge query failed'); process.exit(r.status\|\|1);} const q=JSON.parse(r.stdout.replace(/^\uFEFF/,'')); const results=q.result?.results; if(!Array.isArray(results)) throw new Error('Knowledge results are not an array'); if(!results.some(x=>x.source==='docs/project/rebuild-plan.md')) throw new Error('Plan missing from knowledge results'); const diagnostics=[...(q.diagnostics\|\|[]),...(q.result.diagnostics\|\|[])]; if(diagnostics.length) throw new Error('Knowledge query diagnostics present'); const allowed=new Set(['docs/project/overview.md','docs/project/rebuild-plan.md']); if(results.some(x=>!allowed.has(x.source))) throw new Error('Unexpected knowledge source'); console.log(JSON.stringify({provider:q.provider,results:results.map(({source,title})=>({source,title})),diagnostics},null,2)); | . | passed | 0 | 1107 ms |
| UI design reuse decision is retrievable | -e const {spawnSync}=require('node:child_process'); const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_global/node_modules/@rpamis/comet/bin/comet.js','knowledge','query','.', '--task','旧 UI 设计优先复用 认可旧界面 尽量复用 布局 视觉 主要交互 P1 核心流程','--phase','verify','--json'],{encoding:'utf8',windowsHide:true,timeout:55000,maxBuffer:8*1024*1024}); if(r.error) throw r.error; if(r.status!==0){process.stderr.write(r.stderr\|\|'Knowledge query failed'); process.exit(r.status\|\|1);} const q=JSON.parse(r.stdout.replace(/^\uFEFF/,'')); const results=q.result?.results; if(!Array.isArray(results)) throw new Error('Knowledge results are not an array'); if(!results.some(x=>x.source==='docs/project/rebuild-plan.md')) throw new Error('Plan missing from knowledge results'); if(!results.some(x=>x.source==='docs/project/rebuild-plan.md' && x.title==='旧 UI 设计优先复用')) throw new Error('UI design reuse section not retrieved'); const diagnostics=[...(q.diagnostics\|\|[]),...(q.result.diagnostics\|\|[])]; if(diagnostics.length) throw new Error('Knowledge query diagnostics present'); const allowed=new Set(['docs/project/overview.md','docs/project/rebuild-plan.md']); if(results.some(x=>!allowed.has(x.source))) throw new Error('Unexpected knowledge source'); console.log(JSON.stringify({provider:q.provider,results:results.map(({source,title})=>({source,title})),diagnostics},null,2)); | . | passed | 0 | 1056 ms |

## 阻塞项

_无。_

## 风险与跳过的工作

_未报告风险。_

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | 0 | recovery | — | Native Shape artifacts changed | 2026-09-11T04:25:19.639Z |
| 2 | 1 | 1 | execution-error | — | Native Verifier response was invalid: Native Verifier check ID knowledge-sources conflicts with a Runtime check | 2026-09-11T06:23:21.284Z |
| 2 | 1 | 1 | recovery | — | 必要检查的 PowerShell 子进程 JSON 解析失败；保持已确认目标、A1-A14 和全部规划文档不变，只修正知识检索检查的执行方式并重新提交候选。 | 2026-09-11T06:28:46.067Z |
| 2 | 2 | 1 | pass | — | 独立全量验收 A1–A14 通过。已核对当前 stateVersion 12 对应的原始日志，前缀为 28403d8e-5984-4feb-8fef-558c636b3ec8；git-whitespace、comet-health、workspace-documents、knowledge-sources 均 passed、exitCode 0。知识检查通过官方 Node 入口以 UTF-8 解析，保留全部断言，实际命中新版规划与概览且 diagnostics 为空。结论仅适用于整体规划交付；本执行未写文件或推进 Runtime。 | 2026-09-11T06:47:59.116Z |
| 2 | 2 | 1 | recovery | — | 用户修正 UI 复用原则：认可旧 UI 设计，要求新版尽量复用；其余规划和验收结果接受。只修订界面设计复用要求，保留跨行业定位、功能恢复、空数据策略和阶段依赖，不实施业务。 | 2026-09-11T07:05:11.388Z |
| 3 | 1 | 1 | pass | — | 独立全量验收 A1–A16 通过。已核对 stateVersion 18、当前候选及原始日志前缀 e2f01b11-2353-43fb-9ee1-390ea4453149；git-whitespace、comet-health、workspace-documents、knowledge-sources、ui-design-knowledge 均 passed、exitCode 0。知识检索仅命中新版规划与概览，diagnostics 为空。旧 UI 优先复用要求完整落入规划和后续 P1 边界，其余既有规划语义保持一致。结论仅适用于规划交付，不代表页面视觉还原、业务或真机验收；本执行未写文件、推进 Runtime、连接数据库或启动业务。 | 2026-09-11T07:26:23.740Z |



## 结论

独立全量验收 A1–A16 通过。已核对 stateVersion 18、当前候选及原始日志前缀 e2f01b11-2353-43fb-9ee1-390ea4453149；git-whitespace、comet-health、workspace-documents、knowledge-sources、ui-design-knowledge 均 passed、exitCode 0。知识检索仅命中新版规划与概览，diagnostics 为空。旧 UI 优先复用要求完整落入规划和后续 P1 边界，其余既有规划语义保持一致。结论仅适用于规划交付，不代表页面视觉还原、业务或真机验收；本执行未写文件、推进 Runtime、连接数据库或启动业务。
