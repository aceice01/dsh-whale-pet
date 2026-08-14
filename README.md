<p align="center">
  <img src="docs/preview.png" alt="DeepSeek Whale Girl Pet" width="720">
</p>

<h1 align="center">🐋 DeepSeek 鲸鱼娘桌宠</h1>

<p align="center">
  <b>DeepSeek Harness 桌面宠物</b> — 蓝发女仆 + 鲸鱼尾动画 · 晓伊神经网络语音 · 撒娇互动 · 任务完成提醒
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-blue">
  <img alt="License" src="https://img.shields.io/github/license/aceice01/dsh-whale-pet">
  <img alt="Voice" src="https://img.shields.io/badge/voice-Xiaoyi%20Neural-ff69b4">
  <img alt="Lines" src="https://img.shields.io/badge/lines-49-9cf">
</p>

---

## ✨ 功能

| 功能 | 说明 |
|---|---|
| 🐋 官方形象 | DeepSeek 鲸鱼娘动画（透明背景，已去绿幕/品红残留） |
| 🎞️ 状态动画 | 待机 / 工作 / 完成 / 出错 / 撒娇 / 跳跃，待机变体轮换 |
| 🗣️ 晓伊语音 | 神经网络人声，49 条台词预合成，完全离线播放 |
| 🥰 互动 | 戳一戳随机反应 · 长按摸头 · 双击静音 · 右键菜单 · 三击诊断 |
| 📢 提醒 | 任务完成（跳跃+纸屑+琶音+语音）· 出错安慰 · 审批提示 · 进度播报 |
| 🎛️ 音量 | 总音量 + 语音/音效/庆祝分动作音量（持久保存） |
| 🖱️ 拖动 | 桌面版全身拖动 · Web 版按住鲸鱼娘拖动 |

支持 **两种形态**：

- 🖥️ **桌面版**：DSH Desktop（Electron）右下角独立透明置顶小窗
- 🌐 **Web 版**：浏览器访问 `dsh --profile web` 时，页面右下角悬浮层

## 📦 安装

### 要求

- **Windows**
- 已安装 **DeepSeek Harness 桌面客户端** 和/或 **npx 版 dsh**

### 一键安装

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

脚本自动安装到两个 profile 并启用插件（自动备份原文件）：

| 版本 | Profile 路径 |
|---|---|
| 桌面版 | `%APPDATA%\dsh-desktop-client\dsh\profiles\web` |
| Web 版 | `%USERPROFILE%\.dsh\profiles\web` |

安装后**重启** DSH 桌面应用 / dsh web 服务生效。

### 其他选项

```powershell
install.ps1 -Target desktop   # 只装桌面版
install.ps1 -Target web       # 只装 Web 版
install.ps1 -Uninstall        # 卸载
install.ps1 -DryRun           # 预览，不实际改动
```

## 🎮 使用

### 桌面版

| 操作 | 效果 |
|---|---|
| 按住角色任意位置 | 拖动窗口 |
| 单击帽子 | 戳一戳（65% 撒娇 / 20% 蹦跳 / 15% 委屈） |
| 长按帽子 0.7s | 摸头（开心蹦跳 + "被主人摸头啦"） |
| 双击帽子 | 静音 / 恢复 |
| 右键帽子 | 功能菜单（总音量 / 语音 / 音效 / 庆祝音量 · 测试语音 · 诊断 · 版本 · 刷新） |
| 三击帽子 | TTS 诊断面板 |

### Web 版

| 操作 | 效果 |
|---|---|
| 按住鲸鱼娘 | 拖动悬浮面板 |
| 右上角 ✕ | 隐藏（变 🐋 按钮） |
| 点击 🐋 | 恢复 |

## 🏗️ 架构

```
dsh-balance-widget/          # Cordis 插件（服务端 + 客户端）
└── lib/
    ├── index.js             # 服务端：/pet.html /api/status /api/balance
    │                        #   - 从 session firehose 监听 turn/tool/todo/goal/approval
    │                        #   - /api/status 输出工作状态供桌宠轮询
    ├── client.js            # 客户端：会话头部余额徽章 + Web 版悬浮桌宠
    └── pet.html             # 桌宠页面（动画 + 语音 + 交互，1.5MB 内嵌资源）
```

**工作流**：

```
DSH server (session/event firehose)
        │  turn/start · turn/end · tool/call · todo/write ...
        ▼
index.js  ── /api/status ──►  pet.html (轮询 1.5s)
                                ├─ 状态机：idle/running/happy/coquetry/sad
                                ├─ 动画：webp 内嵌（帧延迟×3，节奏舒缓）
                                ├─ 语音：AudioContext 播放预合成晓伊 mp3
                                └─ 交互：拖动/戳/摸头/右键菜单/音量
```

**桌面版**：Electron 主进程创建透明置顶小窗 → 加载 `/pet.html`
**Web 版**：`client.js` 注入 `shell.overlay` 悬浮层 → iframe 加载 `/pet.html`（postMessage 桥接拖动）

## 🔧 自定义

### 换语音 / 加台词

需要 Python 3.9+：

```powershell
pip install edge-tts pillow
# 1. 编辑 tools/synth_all.py 里的 LINES 台词表
# 2. 重新合成语音（晓伊音色，可换 PET_VOICE 环境变量）
python tools/synth_all.py
# 3. 构建 pet.html（注入动画 + 语音）
node tools/build-pet.mjs
# 4. 安装
powershell -ExecutionPolicy Bypass -File install.ps1
```

### 修图工具（仅当替换素材时需要）

```powershell
python tools/despill.py    # 去绿幕残留（素材是绿幕抠图时）
python tools/defringe.py   # 去品红残留（白背景下边缘干净）
```

## 📁 目录结构

```
dsh-whale-pet/
├── install.ps1            # 一键安装/卸载（支持 -Target / -DryRun）
├── docs/preview.png       # 项目预览图
├── plugin/
│   └── dsh-balance-widget/  # 桌宠插件
│       ├── package.json
│       └── lib/
│           ├── index.js     # 服务端路由 + 事件监听
│           ├── client.js    # 客户端（余额徽章 + Web 桌宠）
│           └── pet.html     # 桌宠页面
└── tools/
    ├── synth_all.py       # 语音合成（edge-tts → lib/audio.json）
    ├── build-pet.mjs      # 构建 pet.html（动画+语音注入）
    ├── despill.py         # 去绿幕残留
    └── defringe.py        # 去品红残留
```

## ❓ FAQ

**桌宠没出现？**
1. 确认安装脚本输出均为 `[OK]`
2. **重启** DSH 桌面应用 / dsh web 服务（插件在启动时加载）
3. 检查 `cordis.patch.yml` 是否包含 `balance-widget`

**Web 版桌宠不显示？**
- 确认访问的是重启后的 dsh web 服务，浏览器强制刷新（Ctrl+F5）

**语音没声音？**
- 确认已在**首次使用时点击过桌宠**（解锁 AudioContext，浏览器自动播放策略）
- 检查右键菜单里的音量滑块 > 0
- Web 版需确认 iframe 未被广告拦截器屏蔽

**如何参与贡献？** 见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

[MIT](LICENSE)

## 🙏 致谢

- 角色动画素材：[codex-pet-DeepSeek-girl](https://github.com/xpy12367/codex-pet-DeepSeek-girl)
- 行为系统参考：[DeskPet](https://github.com/2048Nemo/DeskPet)
- 语音合成：[edge-tts](https://github.com/rany2/edge-tts)
