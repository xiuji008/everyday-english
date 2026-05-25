# Everyday English - 每日英语单词

每天生成 5 个实用英语单词，通过 Vite 本地预览，通过 GitHub Pages 自动部署。

## 快速开始

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev
```

打开 `http://localhost:3000` 即可浏览所有每日单词。左侧边栏按年月分组显示，点击任意日期查看单词详情。

## 项目结构

```
everyday-english/
├── .codebuddy/skills/english-words-generator/  # CodeBuddy 技能定义
├── docs/                    # Markdown 单词文件（按年/月分组）
│   ├── images/              # 封面图存放目录
│   ├── words-index.json     # 生产环境索引（由 scripts/generate-index.js 生成）
│   └── YYYY/MM/YYYY-MM-DD-XX.md
├── scripts/
│   ├── config.json                # 技能配置文件
│   ├── generate-daily-words.js    # 文件操作辅助脚本
│   └── generate-index.js          # 生产环境索引生成脚本
├── index.html               # Vite 入口
├── main.js                  # 前端应用逻辑
├── style.css                # 样式
├── vite.config.js           # Vite 配置 + 本地 API
└── package.json
```

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地开发服务器（浏览单词） |
| `npm run build` | Vite 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run generate` | 手动调用生成脚本 |

## 生成每日单词

在 CodeBuddy 中触发技能 `english-words-generator`，或运行对应命令：

```bash
node scripts/generate-daily-words.js <command>
```

详见 `.codebuddy/skills/english-words-generator/SKILL.md`。

## GitHub Pages 部署

1. 在 GitHub 仓库 Settings → Pages 中：
   - Source: **Deploy from a branch**
   - Branch: `main` / 根目录 `/`
2. 每次提交前运行 `node scripts/generate-index.js` 更新索引
3. 提交后 1-2 分钟自动生效

> **提示**：本地开发用 `npm run dev`（Vite 会自动提供 API），生产环境用预生成的 `words-index.json`。
