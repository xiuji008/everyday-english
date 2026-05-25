#!/usr/bin/env node

/**
 * 构建后处理脚本：将 docs/ 目录和静态资源复制到 dist/
 * 使 dist/ 可以直接部署到 GitHub Pages
 *
 * 用法: node scripts/copy-to-dist.js
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const docsDir = path.join(rootDir, 'docs')
const distDir = path.join(rootDir, 'dist')
const distDocsDir = path.join(distDir, 'docs')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

// 1. 复制 docs/ 到 dist/docs/
console.log('📁 复制 docs/ → dist/docs/')
copyDir(docsDir, distDocsDir)

// 2. 复制 avatar.png 到 dist/
copyFile(path.join(rootDir, 'avatar.png'), path.join(distDir, 'avatar.png'))

// 3. 复制 .nojekyll 到 dist/
copyFile(path.join(rootDir, '.nojekyll'), path.join(distDir, '.nojekyll'))

// 4. 生成 words-index.json 到 dist/docs/
const result = []
function scanDir(dirPath, docsBase) {
  let entries
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory() && entry.name !== 'images') {
      scanDir(fullPath, docsBase)
    } else if (entry.name.endsWith('.md')) {
      const relative = path.relative(docsBase, fullPath).replace(/\\/g, '/')
      const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})\.md$/)
      const date = match ? match[1] : entry.name.replace('.md', '')
      result.push({ date, seq: match ? match[2] : '00', file: relative, title: `${date} 每日英语` })
    }
  }
}
scanDir(distDocsDir, distDocsDir)
result.sort((a, b) => b.date.localeCompare(a.date) || b.seq.localeCompare(a.seq))
fs.writeFileSync(path.join(distDocsDir, 'words-index.json'), JSON.stringify(result, null, 2), 'utf-8')
console.log(`✅ words-index.json 已生成 (${result.length} 个文件)`)

// 5. 生成 images-index.json（列出 images 下的图片，供前台随机选用）
const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const imagesDir = path.join(distDocsDir, 'images')
let images = []
try {
  const files = fs.readdirSync(imagesDir)
  images = files.filter(f => exts.includes(path.extname(f).toLowerCase().replace('.', '')))
} catch { /* ignore */ }
fs.writeFileSync(path.join(distDocsDir, 'images-index.json'), JSON.stringify(images, null, 2), 'utf-8')
console.log(`✅ images-index.json 已生成 (${images.length} 张图片)`)
console.log('✅ dist/ 构建完成，可直接部署')
