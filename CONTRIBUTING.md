# Contributing

感谢你愿意参与这个项目！以下是贡献指南。

## 开发环境

- Windows
- Node.js 18+（构建脚本用）
- Python 3.9+（语音合成/修图用）
- 已安装 DSH Desktop 或 npx dsh（用于本地测试）

## 项目结构

- `plugin/dsh-balance-widget/lib/pet.html` — 桌宠页面（核心，动画+语音+交互）
- `plugin/dsh-balance-widget/lib/index.js` — 服务端插件（事件监听 + API 路由）
- `plugin/dsh-balance-widget/lib/client.js` — 客户端插件（Web 版悬浮桌宠 + 余额徽章）
- `tools/` — 构建工具（语音合成、pet.html 构建、修图）

## 本地开发流程

1. 修改 `pet.html`（或 `pet.template.html` + 重新构建）
2. 在本地 DSH 环境安装：
   ```powershell
   powershell -ExecutionPolicy Bypass -File install.ps1
   ```
3. 重启 DSH 桌面应用 / dsh web 服务
4. 验证功能（桌宠页每 10 秒自检版本，页面改动可热更新）

## 提交规范

- 提交信息用英文，遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
  - `feat:` 新功能
  - `fix:` 修复
  - `docs:` 文档
  - `refactor:` 重构
  - `style:` 格式
  - `test:` 测试
- 保持提交粒度：一次提交一个逻辑变更

## 注意事项

- `pet.html` 是构建产物，修改台词/动画后请同步更新 `tools/synth_all.py` 和 `tools/build-pet.mjs`，并重新构建
- 不要在 `pet.html` / `client.js` 里硬编码本机路径
- 新增台词时，`LINES`（pet.html 内）与 `tools/synth_all.py` 的台词表必须一致（speak() 按文本匹配）
- 动画素材有版权（见 README 致谢），替换素材时注意许可
