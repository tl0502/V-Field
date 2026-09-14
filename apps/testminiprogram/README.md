# 本地测试小程序

与 `apps/miniprogram/src` 共用业务页面、组件与状态逻辑；构建时只替换请求适配器及会话存储键。测试包通过 `uni.request` 直连 `https://wxbk-api.regonx.top/`，正式小程序仍通过 `wx.cloud.callContainer` 使用既有云托管服务。

在仓库根运行 `npm run build:testminiprogram`，然后在微信开发者工具打开 `D:\Project\WECHAT-PROJECT-next\apps\testminiprogram\dist\build\mp-weixin`。业务源码有改动时重新运行该命令，再在工具内编译。也可以导入本目录，根配置会指向同一份产物。

`npm run build` 会顺序构建正式小程序、测试小程序及两个后台，并检查两份小程序产物的路由、会话键和页面一致性。已有产物也可以只运行 `npm run check:miniprogram-builds` 核查。两份小程序输出互不覆盖，使用同一 AppID；登录使用真实微信 code，不注入虚构身份。

构建输出来自共享源码，勿直接修改 `dist`。测试入口不参与云托管 Docker 镜像运行。微信云端发布仍按远程仓库的流水线执行，测试构建不触发部署。

直连后端保持 `TRUST_CLOUDRUN_IDENTITY=0`（默认），使用真实微信 code 换取身份，并忽略客户端传入的 `x-wx-openid` 等身份头。CloudRun 专用镜像只在微信可信网关后开启该开关。

真机测试需在微信小程序管理后台将 `https://wxbk-api.regonx.top` 加入 request 合法域名。开发者工具关闭域名校验只影响本地调试，不能代替真机配置。测试会话存储键为 `vquan.test.session`，正式包为 `vquan.session`。
