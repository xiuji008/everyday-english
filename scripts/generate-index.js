#!/usr/bin/env node

/**
 * 生成 docs/words-index.json - 供 GitHub Pages 生产环境使用
 *
 * 扫描 docs/ 下所有 MD 文件，生成索引 JSON，
 * 使得 GitHub Pages 上的前端也能获取单词列表。
 *
 * 用法: node scripts/generate-index.js
 */

const fs = require('fs')
const path = require('path')

const docsDir = path.resolve(__dirname, '..', 'docs')
const outputFile = path.join(docsDir, 'words-index.json')

function scan() {
  const result = []

  function scanDir(dirPath) {
    let entries
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory() && entry.name !== 'images') {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.md')) {
        // 计算相对于 docs/ 的路径
        const relative = path.relative(docsDir, fullPath).replace(/\\/g, '/')
        const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})\.md$/)
        const date = match ? match[1] : entry.name.replace('.md', '')
        result.push({
          date,
          seq: match ? match[2] : '00',
          file: relative,
          title: `${date} 每日英语`
        })
      }
    }
  }

  scanDir(docsDir)

  // 按日期排序（最新在前）
  result.sort((a, b) => b.date.localeCompare(a.date) || b.seq.localeCompare(a.seq))

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`✅ 已生成索引文件: ${outputFile} (${result.length} 个文件)`)
}

scan()
