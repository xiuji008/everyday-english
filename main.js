// 每日英语单词 - 主应用逻辑

const tagColors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal']

function hashColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return tagColors[Math.abs(hash) % tagColors.length]
}

const state = {
  words: [],
  currentFile: null,
  collapsedMonths: new Set() // 已折叠的年月 key: "YYYY-MM"
}

// ============ API 调用 ============

async function fetchWordList() {
  // 开发环境: Vite API
  try {
    const res = await fetch('/api/words')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch { /* 忽略 */ }

  // GitHub Pages: 预生成的索引文件
  const res = await fetch('./docs/words-index.json')
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('words-index.json format error')
  return data
}

async function fetchWordContent(filePath) {
  const res = await fetch(`/api/word-content?file=${encodeURIComponent(filePath)}`)
  if (!res.ok) {
    const mdRes = await fetch(`./docs/${filePath}`)
    const text = await mdRes.text()
    let frontmatter = {}
    let body = text
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
    if (fmMatch) {
      for (const line of fmMatch[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w+):\s*(.+)$/)
        if (kv) frontmatter[kv[1]] = kv[2].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1')
      }
      body = fmMatch[2]
    }
    return { frontmatter, body }
  }
  return res.json()
}

async function fetchRandomImage() {
  // 开发环境: Vite API
  try {
    const res = await fetch('/api/random-image')
    if (res.ok) {
      const data = await res.json()
      if (data.url) return data.url
    }
  } catch { /* 忽略 */ }

  // GitHub Pages: 读取图片索引，随机选一张
  try {
    const res = await fetch('./docs/images-index.json')
    const images = await res.json()
    if (images.length > 0) {
      const img = images[Math.floor(Math.random() * images.length)]
      return `./docs/images/${img}`
    }
  } catch { /* 忽略 */ }

  return ''
}

// ============ 侧边栏渲染（可折叠） ============

function renderSidebar(words) {
  const container = document.getElementById('wordList')

  if (words.length === 0) {
    container.innerHTML = '<div class="loading">暂无单词数据，请先生成 🚀</div>'
    return
  }

  // 按年月分组
  const groups = {}
  for (const w of words) {
    const ym = w.date.substring(0, 7)
    if (!groups[ym]) groups[ym] = []
    groups[ym].push(w)
  }

  // 年月排序（最新的在前）
  const sortedYMs = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  let html = ''
  for (const ym of sortedYMs) {
    const [year, month] = ym.split('-')
    const items = groups[ym]
    // 如果当前文件在这个月内，默认展开
    const activeInGroup = items.some(i => i.file === state.currentFile)
    const isCollapsed = state.collapsedMonths.has(ym)

    // 如果当前文件的月份未手动折叠且没有被折叠过，默认展开
    const shouldCollapse = activeInGroup ? false : isCollapsed

    html += `
      <div class="month-group">
        <div class="month-header" data-ym="${ym}">
          <span class="month-left">
            <span class="month-toggle ${shouldCollapse ? 'collapsed' : ''}">▼</span>
            ${year} 年 ${month} 月
            <span class="month-count">(${items.length})</span>
          </span>
        </div>
        <div class="month-items${shouldCollapse ? ' collapsed' : ''}" data-ym="${ym}">
    `

    for (const item of items) {
      const activeClass = state.currentFile === item.file ? ' active' : ''
      const [, m, d] = item.date.split('-')
      html += `
        <div class="sidebar-item${activeClass}" data-file="${item.file}" data-date="${item.date}">
          <div class="date-badge">
            <span class="month">${parseInt(m)}月</span>
            <span class="day">${parseInt(d)}</span>
          </div>
          <div class="item-info">
            <div class="item-title">第 ${parseInt(item.seq)} 篇</div>
            <div class="item-meta">${item.date}</div>
          </div>
        </div>
      `
    }

    html += `</div></div>`
  }

  container.innerHTML = html

  // 绑定折叠事件
  container.querySelectorAll('.month-header').forEach(el => {
    el.addEventListener('click', () => {
      const ym = el.dataset.ym
      toggleCollapse(ym)
    })
  })

  // 绑定日期点击事件
  container.querySelectorAll('.sidebar-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const file = el.dataset.file
      const date = el.dataset.date
      loadWord(file, date)
    })
  })
}

function toggleCollapse(ym) {
  const content = document.querySelector(`.month-items[data-ym="${ym}"]`)
  const toggle = document.querySelector(`.month-header[data-ym="${ym}"] .month-toggle`)
  if (!content) return

  const willCollapse = !content.classList.contains('collapsed')

  content.classList.toggle('collapsed', willCollapse)
  toggle.classList.toggle('collapsed', willCollapse)

  if (willCollapse) {
    state.collapsedMonths.add(ym)
  } else {
    state.collapsedMonths.delete(ym)
  }
}

// ============ 单词详情渲染 ============

function renderWordDetail(data, filePath, bgImage) {
  const { frontmatter, body } = data

  // 更新侧边栏高亮
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.file === filePath)
  })

  // 确保当前文件所在月份是展开的
  const dateMatch = filePath.match(/(\d{4}-\d{2})-\d{2}-\d{2}\.md$/)
  if (dateMatch) {
    const ym = dateMatch[1]
    if (state.collapsedMonths.has(ym)) {
      toggleCollapse(ym)
    }
  }

  // 隐藏欢迎页，显示详情
  document.getElementById('welcome').style.display = 'none'
  const detailEl = document.getElementById('wordDetail')
  detailEl.style.display = 'block'

  // 解析日期
  const dateStr = filePath.match(/(\d{4}-\d{2}-\d{2})-\d{2}\.md$/)
  const date = dateStr ? dateStr[1] : ''
  const [, m, d] = date.split('-')

  // 解析 tags
  const tags = frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : []

  // ===== 构建背景图 URL =====
  const bgUrl = bgImage || ''
  const seq = filePath.match(/-(\d{2})\.md$/)?.[1] || '?'

  // ===== 渲染 Hero 头部（背景图 + 所有信息叠加） =====
  const heroEl = document.getElementById('detailHero')
  heroEl.innerHTML = `
    <div class="hero-bg"${bgUrl ? ` style="background-image:url(${bgUrl})"` : ''}>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-top">
          ${frontmatter.emoji && frontmatter.emoji !== "''" ? `<span class="hero-emoji">${frontmatter.emoji}</span>` : ''}
          <span class="hero-seq">第 ${seq} 篇</span>
        </div>
        <h1 class="hero-title">${frontmatter.title || `${date} 每日英语推荐`}</h1>
        <div class="hero-meta">
          ${frontmatter.category && frontmatter.category !== "''" ? `<span class="hero-item hero-category">${frontmatter.category}</span>` : ''}
          ${frontmatter.createDate && frontmatter.createDate !== "''" ? `<span class="hero-item hero-createdate">📅 ${frontmatter.createDate}</span>` : `<span class="hero-item hero-createdate">📅 ${date}</span>`}
        </div>
        ${frontmatter.idiom && frontmatter.idiom !== "''" ? `<div class="hero-item hero-idium">「${frontmatter.idiom}」</div>` : ''}
        ${tags.length > 0 ? `<div class="hero-tags">${tags.map(t => `<span class="hero-item hero-tag-${hashColor(t)}">${t}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `

  // ===== 解析并渲染单词 =====
  const words = parseWords(body)
  const wordsEl = document.getElementById('detailWords')
  wordsEl.innerHTML = words.map((w, i) => `
    <div class="word-card">
      <div class="word-header">
        <span class="word-number">${i + 1}.</span>
        <span class="word-text">${w.word}</span>
        <span class="word-phonetic">/${w.phonetic}/</span>
      </div>
      <div class="word-pos">
        <span class="pos">${w.pos}</span>  ${w.meaning}
      </div>
      <div class="word-example">
        <div class="sentence-en">${w.sentenceEn}</div>
        <div class="sentence-zh">${w.sentenceZh}</div>
      </div>
      <div class="word-tip">${w.tip}</div>
    </div>
  `).join('')

  // 滚动到顶部
  document.getElementById('content').scrollTop = 0
}

// ============ Markdown 解析 ============

function parseWords(md) {
  const words = []
  const lines = md.split('\n')
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const wordMatch = line.match(/^##\s+(\d+)\.\s+(\w+)\s+\/(.+?)\//)
    if (wordMatch) {
      if (current) words.push(current)
      current = {
        word: wordMatch[2],
        phonetic: wordMatch[3],
        pos: '',
        meaning: '',
        sentenceEn: '',
        sentenceZh: '',
        tip: ''
      }
      continue
    }

    if (!current) continue

    const posMatch = line.match(/\*\*词性\*\*：(.+?)\s+(.+)/)
    if (posMatch) {
      current.pos = posMatch[1].trim()
      current.meaning = posMatch[2].trim()
      continue
    }

    const exMatch = line.match(/^>\s*(.+)/)
    if (exMatch) {
      if (!current.sentenceEn) {
        current.sentenceEn = exMatch[1]
      } else if (!current.sentenceZh) {
        current.sentenceZh = exMatch[1]
      }
      continue
    }

    const tipMatch = line.match(/^\*\*记忆提示\*\*/)
    if (tipMatch && i + 1 < lines.length) {
      current.tip = lines[i + 1].trim()
    }
  }

  if (current) words.push(current)
  return words
}

// ============ 加载单词 ============

async function loadWord(filePath, date) {
  if (!filePath) return
  state.currentFile = filePath
  window.location.hash = `#${date}`

  try {
    const [data, bgImage] = await Promise.all([
      fetchWordContent(filePath),
      fetchRandomImage()
    ])
    renderWordDetail(data, filePath, bgImage)
  } catch (e) {
    console.error('加载单词失败:', e)
  }
}

// ============ 初始化 ============

async function init() {
  try {
    const words = await fetchWordList()
    state.words = words
    renderSidebar(words)

    const hash = window.location.hash.replace('#', '')
    if (hash && words.length > 0) {
      const target = words.find(w => w.date === hash)
      if (target) {
        await loadWord(target.file, target.date)
        return
      }
    }

    if (words.length > 0) {
      await loadWord(words[0].file, words[0].date)
    }
  } catch (e) {
    console.error('初始化失败:', e)
    document.getElementById('wordList').innerHTML = '<div class="loading">加载失败，请确认 npm run dev 已启动</div>'
  }
}

window.addEventListener('hashchange', async () => {
  const hash = window.location.hash.replace('#', '')
  if (hash && state.words.length > 0) {
    const target = state.words.find(w => w.date === hash)
    if (target) {
      await loadWord(target.file, target.date)
    }
  }
})

init()
