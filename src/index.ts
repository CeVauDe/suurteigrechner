import http from 'node:http'

const PORT = Number(process.env.PORT ?? 3000)

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Hello from TypeScript hello-world server!')
    return
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, pid: process.pid, ts: new Date().toISOString() }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Server ready — listening on http://localhost:${PORT}`)
})
