#!/usr/bin/env node

/**
 * 每日英语单词生成脚本 - 文件操作辅助
 *
 * 功能：
 * - 读取配置文件
 * - 计算下一个序号
 * - 随机选取封面图
 * - 创建目录
 * - Git 提交和推送
 *
 * 用法：node scripts/generate-daily-words.js <命令> [参数]
 *
 * 命令：
 *   next-seq     - 计算下一个文件序号
 *   random-cover - 随机选取封面图片
 *   create-dirs  - 创建年月目录
 *   git-push     - Git 提交并推送
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.resolve(__dirname, 'config.json');

// ============ 配置读取 ============

function loadConfig() {
  const defaultConfig = {
    repo_path: path.resolve(__dirname, '..'),
    words_per_day: 5,
    image_dir: 'docs/images',
    image_extensions: ['jpg', 'jpeg', 'png', 'webp'],
    default_emojis: ['📚', '📖', '✍️', '🌟', '💡'],
    default_category: '/English/Daily',
    default_tags: ['英语学习', '词汇积累'],
    idioms: [
      '养天地正气，法古今完人',
      '学而不思则罔，思而不学则殆',
      '千里之行，始于足下',
      '温故而知新，可以为师矣',
      '知之者不如好之者，好之者不如乐之者',
      '书山有路勤为径，学海无涯苦作舟',
      '不积跬步，无以至千里',
      '业精于勤，荒于嬉；行成于思，毁于随',
      '宝剑锋从磨砺出，梅花香自苦寒来',
      '读万卷书，行万里路'
    ]
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      const config = { ...defaultConfig, ...userConfig };
      // 确保 repo_path 是绝对路径
      if (!path.isAbsolute(config.repo_path)) {
        config.repo_path = path.resolve(__dirname, '..');
      }
      return config;
    }
  } catch (e) {
    console.error('警告：读取配置文件失败，使用默认配置', e.message);
  }

  // 配置文件不存在则创建
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  console.log('已创建默认配置文件:', CONFIG_PATH);
  return defaultConfig;
}

// ============ 日期工具 ============

function getDateParts(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  return { year, month, day, date };
}

// ============ 命令：计算下一个序号 ============

function nextSeq(dateStr) {
  const config = loadConfig();
  const { year, month, date } = getDateParts(dateStr);
  const dir = path.join(config.repo_path, 'docs', String(year), month);

  let seq = 0;
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.startsWith(`${date}-`) && f.endsWith('.md'));
    seq = files.length;
  }

  const next = seq + 1;
  const seqStr = String(next).padStart(2, '0');
  console.log(JSON.stringify({ seq: next, seqStr, date, year, month, day: getDateParts(dateStr).day }));
  return { seq: next, seqStr, date, year: String(year), month };
}

// ============ 命令：随机选取封面图 ============

function randomCover() {
  const config = loadConfig();
  const imagesDir = path.resolve(config.repo_path, config.image_dir);

  if (!fs.existsSync(imagesDir)) {
    console.log(JSON.stringify({ cover: '' }));
    return { cover: '' };
  }

  const allFiles = fs.readdirSync(imagesDir);
  const exts = config.image_extensions || ['jpg', 'jpeg', 'png', 'webp'];
  const images = allFiles.filter(f => exts.includes(path.extname(f).toLowerCase().replace('.', '')));

  if (images.length === 0) {
    console.log(JSON.stringify({ cover: '' }));
    return { cover: '' };
  }

  const cover = images[Math.floor(Math.random() * images.length)];
  console.log(JSON.stringify({ cover }));
  return { cover };
}

// ============ 命令：创建目录 ============

function createDirs(dateStr) {
  const config = loadConfig();
  const { year, month } = getDateParts(dateStr);
  const dir = path.join(config.repo_path, 'docs', String(year), month);

  fs.mkdirSync(dir, { recursive: true });
  console.log(`目录已创建/确认: ${dir}`);
  return dir;
}

// ============ 命令：获取已有单词列表（去重用） ============

function listExistingWords() {
  const config = loadConfig();
  const docsDir = path.join(config.repo_path, 'docs');
  const allWords = new Set();

  if (!fs.existsSync(docsDir)) {
    console.log(JSON.stringify({ words: [] }));
    return { words: [] };
  }

  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'images') {
          scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // 提取所有出现的英文单词（在 ## 标题行中）
        const wordMatches = content.matchAll(/^## \d+\.\s+(\w+)/gm);
        for (const match of wordMatches) {
          allWords.add(match[1].toLowerCase());
        }
      }
    }
  }

  scanDir(docsDir);
  const words = [...allWords];
  console.log(JSON.stringify({ words, count: words.length }));
  return { words, count: words.length };
}

// ============ 命令：Git 推送 ============

function gitPush(dateStr, seq) {
  const config = loadConfig();
  const repoPath = config.repo_path;

  try {
    const message = `feat: 添加 ${dateStr}-${seq} 每日英语单词`;

    execSync('git add .', { cwd: repoPath, stdio: 'pipe' });

    // 检查是否有变更需要提交
    const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' }).trim();
    if (!status) {
      console.log('没有变更需要提交');
      return { success: true, message: 'nothing to commit' };
    }

    execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: 'pipe' });
    execSync('git push', { cwd: repoPath, stdio: 'pipe' });

    console.log('Git 推送成功');
    return { success: true, message: 'push successful' };
  } catch (e) {
    console.error('Git 操作失败:', e.message);
    return { success: false, message: e.message };
  }
}

// ============ 写入 Markdown 文件 ============

function writeFile(dateStr, seqStr, markdownContent) {
  const config = loadConfig();
  const { year, month } = getDateParts(dateStr);
  const dir = path.join(config.repo_path, 'docs', String(year), month);

  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${dateStr}-${seqStr}.md`);
  fs.writeFileSync(filePath, markdownContent, 'utf-8');

  console.log(`文件已写入: ${filePath}`);
  return { filePath, success: true };
}

// ============ 主入口 ============

const command = process.argv[2];

switch (command) {
  case 'next-seq':
    nextSeq(process.argv[3]);
    break;
  case 'random-cover':
    randomCover();
    break;
  case 'create-dirs':
    createDirs(process.argv[3]);
    break;
  case 'existing-words':
    listExistingWords();
    break;
  case 'git-push':
    gitPush(process.argv[3], process.argv[4]);
    break;
  case 'write-file':
    // 从 stdin 读取 markdown 内容
    let body = '';
    process.stdin.on('data', chunk => body += chunk);
    process.stdin.on('end', () => {
      writeFile(process.argv[3], process.argv[4], body);
    });
    break;
  case 'full-push':
    // 完整自动推送：生成索引 → git add → git commit → git push
    const { execSync } = require('child_process');
    const repoPath = path.resolve(__dirname, '..');
    try {
      execSync('node scripts/generate-index.js', { cwd: repoPath, stdio: 'inherit' });
      execSync('git add .', { cwd: repoPath, stdio: 'inherit' });
      const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' }).trim();
      if (!status) {
        console.log('没有变更需要提交');
        break;
      }
      const msg = `feat: 添加 ${process.argv[3] || '今日'} 每日英语单词`;
      execSync(`git commit -m "${msg}"`, { cwd: repoPath, stdio: 'inherit' });
      execSync('git push', { cwd: repoPath, stdio: 'inherit' });
      console.log('✅ 自动推送完成！GitHub Pages 将在 1-2 分钟内更新。');
    } catch (e) {
      console.error('❌ 自动推送失败:', e.message);
    }
    break;
  default:
    console.log(`
用法: node scripts/generate-daily-words.js <命令> [参数]

命令:
  next-seq [date]        - 计算下一个文件序号（date 可选，默认今天）
  random-cover           - 随机选取封面图片
  create-dirs [date]     - 创建年月目录
  existing-words         - 获取已有单词列表（去重用）
  git-push <date> <seq>  - Git 提交并推送
  write-file <date> <seq> - 写入 Markdown 文件（从 stdin 读取内容）
  full-push [msg]        - 一键生成索引 + git add/commit/push
`);
    break;
}
