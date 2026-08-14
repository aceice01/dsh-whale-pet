# Changelog

本项目所有重要变更都会记录在此文件。格式基于
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

> ⚠️ 本项目是**非官方同人项目**，与 DeepSeek 官方无隶属或背书关系，
> **不用于商业用途**。

## [未发布]

### 新增

- 🩹 **main.js 补丁**（`apply-main-patch.ps1` + `patch/`）：修复关闭 DSH Desktop
  主窗口时桌宠窗口不随之关闭、残留在屏幕上的问题
- ⚠️ **非官方同人声明**：README / LICENSE / CONTRIBUTING 均加入免责声明
- 📄 **许可调整**：MIT → **非商业性使用许可**（禁止商业用途）

### 修复

- 🐛 **install.ps1：`cordis.patch.yml` 生成无效 YAML**（[issue #1]）——
  旧代码用 `-replace '^\s*\[\]\s*$'` 删除 `[]` 占位符，但该正则未启用
  Multiline，默认 profile（带注释头）下匹配失败，`[]` 残留导致
  `[] ... - insert:` 文档损坏、插件不加载。改为按行扫描删除 `[]` 行，
  并在写入后用 YAML 解析校验（失败自动回滚备份）
- 🐛 **长按摸头被松手单击覆盖**：长按 700ms 触发摸头后，松手触发 click
  再 poke，把摸头覆盖成撒娇。click handler 检测 `longPressFired` 跳过；
  长按期间移动 >5px 取消长按
- 🐛 **气泡显示与状态恢复共用 timer**：`showBubble` 复用 `celebrateTimer`
  隐藏气泡，会覆盖状态恢复 timer，导致桌宠卡死在 happy/coquetry 状态。
  分离出独立的 `bubbleTimer`
- 🐛 **`edgeAvailable` 未声明**：严格模式下 `ws.onerror` 赋值给未声明变量
  抛 ReferenceError，edgeSpeak 可能卡住。补声明
- 🛡️ **poll 轮询保护 happy 状态**：任务进行中不再打断摸头/庆祝动画

[issue #1]: https://github.com/aceice01/dsh-whale-pet/issues/1

## [0.1.0] - 2026-08-14

### 新增

- 🐋 **鲸鱼娘桌宠**：DeepSeek 鲸鱼娘同人动画素材（社区开源），蓝发女仆 + 鲸鱼尾，透明背景
- 🖥️ **桌面版**：DSH Desktop 右下角独立透明置顶小窗
- 🌐 **Web 版**：dsh web 页面右下角悬浮层（iframe + postMessage 拖动桥接）
- 🗣️ **晓伊神经网络语音**：49 条台词预合成（edge-tts），离线播放
- 🥰 **互动**：戳一戳随机反应（撒娇/蹦跳/委屈）、长按摸头、双击静音
- 📢 **提醒**：任务完成庆祝（跳跃+纸屑+琶音+语音）、出错安慰、审批/进度播报
- 🎛️ **音量控制**：总音量 + 语音/音效/庆祝分动作音量，持久保存
- 🎞️ **待机变体轮换**：空闲时随机播放不同动画，不单调
- 📋 **右键菜单**：声音开关 / 音量滑块 / 测试语音 / 诊断 / 版本 / 刷新
- 🖱️ **拖动**：桌面版全身可拖；Web 版按住鲸鱼娘拖动 + ✕ 隐藏/🐋 恢复
- 📦 **一键安装**：`install.ps1`（支持 `-Target` / `-Uninstall` / `-DryRun`，自动备份）
- 🧹 **素材清理**：`despill.py` 去绿幕残留、`defringe.py` 去品红残留
- 🔧 **可定制**：`synth_all.py` 换音色/加台词、`build-pet.mjs` 重新构建

### 修复

- 透明背景下的绿边（绿幕抠图残留）→ 逐帧 despill
- 白色背景下的品红残留边 → 逐帧 defringe
- Electron 沙箱里系统 TTS 不发声 → 预合成语音 + AudioContext 播放
- 自更新不生效（版本号未变）→ 强制绕过缓存 + 版本号递增
- 右键菜单点击外部不关闭（drag 区域吞事件）→ 遮罩层 + window.blur
- Web 版 iframe 内无法拖动/隐藏 → postMessage 桥接 + rootRef 同步

[0.1.0]: https://github.com/aceice01/dsh-whale-pet/releases/tag/v0.1.0
