function asInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

function maskApiKey(value) {
  if (!value) return ''
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

function normaliseBaseUrl(value) {
  const raw = `${value || ''}`.trim()
  if (!raw) return 'http://localhost:8317'
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('CLIPROXY_BASE_URL must be a valid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('CLIPROXY_BASE_URL must start with http:// or https://')
  }
  return raw.replace(/\/$/, '')
}

function countFailures(details) {
  let count = 0
  for (const detail of details) {
    if (detail?.failed) {
      count += 1
    }
  }
  return count
}

function buildStats(usagePayload, apiKey) {
  const apis = usagePayload?.usage?.apis
  if (!apis || typeof apis !== 'object' || !(apiKey in apis)) {
    return null
  }

  const apiSnapshot = apis[apiKey]
  const modelsSnapshot = apiSnapshot?.models && typeof apiSnapshot.models === 'object' ? apiSnapshot.models : {}

  const models = []
  let totalFailureCount = 0

  for (const [model, modelData] of Object.entries(modelsSnapshot)) {
    const details = Array.isArray(modelData?.details) ? modelData.details : []
    const failureCount = countFailures(details)
    totalFailureCount += failureCount

    models.push({
      model,
      request_count: asInt(modelData?.total_requests),
      total_tokens: asInt(modelData?.total_tokens),
      failure_count: failureCount,
    })
  }

  models.sort((a, b) => {
    if (b.request_count !== a.request_count) {
      return b.request_count - a.request_count
    }
    return a.model.localeCompare(b.model)
  })

  return {
    api_key_masked: maskApiKey(apiKey),
    request_count: asInt(apiSnapshot?.total_requests),
    total_tokens: asInt(apiSnapshot?.total_tokens),
    failure_count: totalFailureCount,
    models,
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = `${process.env.DASHBOARD_API_KEY || ''}`.trim()
  if (!apiKey) {
    res.status(500).json({ error: 'Server misconfigured: DASHBOARD_API_KEY is required' })
    return
  }

  const managementKey = `${process.env.CLIPROXY_MANAGEMENT_KEY || ''}`.trim()
  if (!managementKey) {
    res.status(500).json({ error: 'Server misconfigured: CLIPROXY_MANAGEMENT_KEY is required' })
    return
  }

  let cliproxyBaseUrl
  try {
    cliproxyBaseUrl = normaliseBaseUrl(process.env.CLIPROXY_BASE_URL || 'http://localhost:8317')
  } catch (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const timeoutMs = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 15000)

  try {
    const response = await fetch(`${cliproxyBaseUrl}/v0/management/usage`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${managementKey}`,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      await response.text()
      res.status(502).json({
        error: `CLiProxy management API error: ${response.status}`,
      })
      return
    }

    const usagePayload = await response.json()
    const stats = buildStats(usagePayload, apiKey)

    if (!stats) {
      res.status(404).json({ error: `API key not found in usage snapshot: ${apiKey}` })
      return
    }

    res.status(200).json(stats)
  } catch (error) {
    const isAbort = error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')
    res.status(502).json({
      error: isAbort ? 'Request to CLiProxy timed out' : 'Failed to request CLiProxy management API',
    })
  } finally {
    clearTimeout(timer)
  }
}
