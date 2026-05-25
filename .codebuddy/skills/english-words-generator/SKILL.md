---
name: english-words-generator
description: "生成每日英语单词 Markdown 文件（每篇 5 个单词）并推送到 GitHub 触发 GitHub Pages 部署。当用户要求生成今日单词、每日英语或类似意图时触发。"
---

# 英语单词生成器

## 概述

生成每日英语单词 Markdown 文件，每篇包含 5 个实用英语单词的音标、例句和记忆提示。生成的 MD 文件保存在 `docs/YYYY/MM/` 目录下，自动推送到 GitHub 触发 GitHub Pages 部署。

本项目使用 **Vite** 作为本地开发服务器。运行 `npm install && npm run dev` 即可在 `http://localhost:3000` 浏览所有每日单词页面。开发服务器从 `docs/` 读取 MD 文件并以侧边栏 + 卡片布局渲染。

## 触发关键词

当用户说出以下内容时执行本技能：
- "生成今日单词" / "生成英语单词" / "每日单词"
- "推荐几个单词" / "今日英语"
- "english words" / "daily words"
- 或其他生成每日英语词汇的类似意图

## 执行流程

### 步骤 1：读取配置

读取项目根目录下的配置文件 `scripts/config.json`：

```bash
cat scripts/config.json
```

如果文件不存在，辅助脚本 `scripts/generate-daily-words.js` 会自动创建默认配置。配置项包括：
- `words_per_day`：每日单词数量（默认：5）
- `image_dir`：封面图目录（默认：`docs/images`）
- `image_extensions`：支持的图片格式
- `default_emojis`：随机选取的 Emoji 池
- `default_category`：文章分类
- `default_tags`：固定标签（始终包含"英语学习"、"词汇积累"）
- `idioms`：随机选取的中文格言池

### 步骤 2：计算日期和序号

使用辅助脚本计算下一个序号：

```bash
node scripts/generate-daily-words.js next-seq
```

输出 JSON：`{"seq": 1, "seqStr": "01", "date": "2026-05-25", "year": "2026", "month": "05"}`

脚本自动扫描 `docs/YYYY/MM/` 目录下的已有文件并递增计数器。如果当天没有文件，序号从 `01` 开始。

### 步骤 3：列出已有单词（去重）

获取所有已生成的单词列表，避免重复：

```bash
node scripts/generate-daily-words.js existing-words
```

输出所有已在 MD 文件中出现过的英文单词。

### 步骤 4：随机选取封面图

从 `docs/images/` 目录下随机选取一张图片：

```bash
node scripts/generate-daily-words.js random-cover
```

如果没有图片，封面为空。

### 步骤 5：随机选取 Emoji 和格言

从配置的 `default_emojis` 和 `idioms` 数组中各随机选取一个。

### 步骤 6：生成单词内容（AI 生成）

使用 AI 知识生成 5 个英语单词，遵循以下规则：

**单词选取原则：**
- 优先覆盖**生活场景**（购物、医疗、交通、社交、饮食、旅行）和**职场场景**（会议、邮件、汇报、协作、谈判、面试）
- 难度定位：高中至四六级区间，兼顾实用性和可记忆性
- 对照步骤 3 的已有单词列表进行去重

**每个单词的输出格式：**

```markdown
## {序号}. {word} /{phonetic}/
**词性**：{part_of_speech}  {chinese_meaning}

**例句**：
> {english_sentence}
> {chinese_translation}

**记忆提示**：
{memory_tip}
```

**每个单词必须包含：**
1. 英文单词
2. 国际音标（IPA）
3. 词性（v./n./adj./adv. 等）
4. 中文释义
5. 英文例句（贴近生活或职场场景）
6. 中文翻译
7. 记忆提示（联想记忆、词根词缀、谐音记忆等方式）

### 步骤 7：组装完整 Markdown 文件

模板：

```markdown
---
title: "{YYYY-MM-DD}-{seq} 每日英语推荐"
tags: {tag1},{tag2},{tag3}
category: /English/Daily
emoji: {emoji}
idiom: '{idiom}'
cover: '![](./images/{cover_image})'
createDate: {YYYY-MM-DD}
---

# {YYYY-MM-DD}-{seq} 每日英语推荐

> {emoji} {idiom}

---

## 1. {word1} /{phonetic1}/
**词性**：{pos1}  {meaning1}

**例句**：
> {sentence_en1}
> {sentence_zh1}

**记忆提示**：
{tip1}

---

## 2. {word2} /{phonetic2}/
**词性**：{pos2}  {meaning2}

**例句**：
> {sentence_en2}
> {sentence_zh2}

**记忆提示**：
{tip2}

---

（3-5 同理）
```

**标签动态生成规则：**
根据 5 个单词的主题，从以下标签池动态选取 2-3 个：
- `职场英语` - 包含职场/商务相关词汇时使用
- `生活用语` - 包含日常交流相关词汇时使用
- `旅行英语` - 包含旅行/交通相关词汇时使用
- `学术英语` - 包含学术/研究相关词汇时使用
- `社交英语` - 包含社交/人际关系相关词汇时使用
- `金融英语` - 包含经济/金融相关词汇时使用
- `技术英语` - 包含计算机/技术相关词汇时使用

固定标签 `英语学习` 和 `词汇积累` 始终包含。

### 步骤 8：写入文件

创建目录并写入文件：

```bash
node scripts/generate-daily-words.js create-dirs {YYYY-MM-DD}
```

然后写入组装好的 Markdown 内容：

```bash
node scripts/generate-daily-words.js write-file {YYYY-MM-DD} {seq}
```

通过 stdin 管道传入内容：
```bash
cat << 'EOF' | node scripts/generate-daily-words.js write-file {YYYY-MM-DD} {seqStr}
{完整的_markdown_内容}
EOF
```

或直接使用 Write 工具创建文件到 `docs/{YYYY}/{MM}/{YYYY-MM-DD}-{seqStr}.md`。

### 步骤 9：自动推送

使用一键推送命令（自动生成索引 + git add + commit + push）：

```bash
node scripts/generate-daily-words.js full-push {YYYY-MM-DD}-{seqStr}
```

本步骤为**自动执行**，无需用户手动操作。推送后告知用户："GitHub Pages 将在 1-2 分钟内自动更新网站。"

> 如果推送失败，检查 git 远程仓库是否已配置。

## 辅助脚本

项目根目录下的 `scripts/generate-daily-words.js` 提供以下工具：

| 命令 | 说明 |
|------|------|
| `next-seq [date]` | 计算下一个文件序号 |
| `random-cover` | 随机选取一张封面图 |
| `create-dirs [date]` | 创建年/月目录 |
| `existing-words` | 列出所有已使用的单词 |
| `write-file <date> <seq>` | 从 stdin 写入 Markdown 文件 |
| `git-push <date> <seq>` | Git 添加、提交并推送 |
| `full-push [msg]` | 自动生成索引 + git add/commit/push |

## 重要提示

- 生成前必须读取已有单词列表进行去重
- 确认 `docs/images/` 目录下至少有一张图片，否则封面为空
- 序号自动递增，无需手动指定
- 如果 `config.json` 不存在，使用脚本创建默认配置
- 推送前确保已配置好 Git 远程仓库
