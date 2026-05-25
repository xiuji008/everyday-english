import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    open: true,
  },
  plugins: [
    {
      name: 'word-api',
      configureServer(server) {
        // 单个入口中间件，手动路由
        server.middlewares.use((req, res, next) => {
          // ==================== 处理 /api/words ====================
          if (req.url.startsWith('/api/words')) {
            const docsDir = path.resolve(process.cwd(), 'docs')
            const result = []

            function scanDir(dirPath) {
              try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true })
                for (const entry of entries) {
                  const fullPath = path.join(dirPath, entry.name)
                  if (entry.isDirectory() && entry.name !== 'images') {
                    scanDir(fullPath)
                  } else if (entry.name.endsWith('.md')) {
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
              } catch (e) {
                console.error('scanDir error:', e.message)
              }
            }

            scanDir(docsDir)
            result.sort((a, b) => b.date.localeCompare(a.date) || b.seq.localeCompare(a.seq))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
            return
          }

          // ==================== 处理 /api/word-content ====================
          if (req.url.startsWith('/api/word-content')) {
            const url = new URL(req.url, `http://${req.headers.host}`)
            const filePath = url.searchParams.get('file')

            if (!filePath) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing file parameter' }))
              return
            }

            const fullPath = path.resolve(process.cwd(), 'docs', filePath)

            if (!fullPath.startsWith(path.resolve(process.cwd(), 'docs'))) {
              res.statusCode = 403
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Forbidden' }))
              return
            }

            try {
              const content = fs.readFileSync(fullPath, 'utf-8')

              let frontmatter = {}
              let body = content
              const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
              if (fmMatch) {
                for (const line of fmMatch[1].split(/\r?\n/)) {
                  const kv = line.match(/^(\w+):\s*(.+)$/)
                  if (kv) {
                    frontmatter[kv[1]] = kv[2].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1')
                  }
                }
                body = fmMatch[2]
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ frontmatter, body }))
            } catch (e) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'File not found', file: filePath }))
            }
            return
          }

          // ==================== 处理 /api/random-image ====================
          if (req.url.startsWith('/api/random-image')) {
            const imagesDir = path.resolve(process.cwd(), 'docs', 'images')
            const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
            let images = []
            try {
              const files = fs.readdirSync(imagesDir)
              images = files.filter(f => exts.includes(path.extname(f).toLowerCase().replace('.', '')))
            } catch (e) {
              // images dir not exist
            }
            const image = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : ''
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ image, url: image ? `./docs/images/${image}` : '' }))
            return
          }

          // 非 API 请求，交给 Vite 处理
          next()
        })
      }
    }
  ]
})
