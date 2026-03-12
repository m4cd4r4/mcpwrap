export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url parameter required' })

  try {
    const upstream = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'mcpwrap-explorer/1.0', 'Accept': 'application/json, application/yaml, text/yaml, */*' }
    })
    const text = await upstream.text()
    const ct = upstream.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', ct)
    res.status(upstream.status).send(text)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
