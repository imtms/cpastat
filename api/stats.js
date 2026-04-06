function asInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

function resolveTimeZone(raw) {
  const tz = `${raw || ''}`.trim() || 'Asia/Shanghai'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
  } catch {
    throw new Error('DASHBOARD_TIMEZONE is invalid')
  }
  return tz
}

function formatDateKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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

function detailTokenTotal(detail) {
  const totalTokens = asInt(detail?.tokens?.total_tokens)
  if (totalTokens > 0) return totalTokens
  return (
    asInt(detail?.tokens?.input_tokens) +
    asInt(detail?.tokens?.output_tokens) +
    asInt(detail?.tokens?.reasoning_tokens) +
    asInt(detail?.tokens?.cached_tokens)
  )
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

function buildStats(usagePayload, apiKey, timeZone) {
  const apis = usagePayload?.usage?.apis
  if (!apis || typeof apis !== 'object' || !(apiKey in apis)) {
    return null
  }

  const apiSnapshot = apis[apiKey]
  const modelsSnapshot = apiSnapshot?.models && typeof apiSnapshot.models === 'object' ? apiSnapshot.models : {}

  const models = []
  let totalFailureCount = 0
  let todayRequestCount = 0
  let todayTotalTokens = 0
  let todayFailureCount = 0
  const todayKey = formatDateKey(new Date(), timeZone)

  for (const [model, modelData] of Object.entries(modelsSnapshot)) {
    const details = Array.isArray(modelData?.details) ? modelData.details : []
    const failureCount = countFailures(details)
    totalFailureCount += failureCount

    let modelTodayRequestCount = 0
    let modelTodayTotalTokens = 0
    let modelTodayFailureCount = 0

    for (const detail of details) {
      const tsRaw = detail?.timestamp
      if (!tsRaw) continue

      const ts = new Date(tsRaw)
      if (Number.isNaN(ts.getTime())) continue

      if (formatDateKey(ts, timeZone) !== todayKey) continue

      modelTodayRequestCount += 1
      modelTodayTotalTokens += detailTokenTotal(detail)
      if (detail?.failed) {
        modelTodayFailureCount += 1
      }
    }

    todayRequestCount += modelTodayRequestCount
    todayTotalTokens += modelTodayTotalTokens
    todayFailureCount += modelTodayFailureCount

    models.push({
      model,
      total: {
        request_count: asInt(modelData?.total_requests),
        total_tokens: asInt(modelData?.total_tokens),
        failure_count: failureCount,
      },
      today: {
        request_count: modelTodayRequestCount,
        total_tokens: modelTodayTotalTokens,
        failure_count: modelTodayFailureCount,
      },
    })
  }

  models.sort((a, b) => {
    if (b.total.request_count !== a.total.request_count) {
      return b.total.request_count - a.total.request_count
    }
    return a.model.localeCompare(b.model)
  })

  return {
    api_key_masked: maskApiKey(apiKey),
    timezone: timeZone,
    today: {
      date: todayKey,
      request_count: todayRequestCount,
      total_tokens: todayTotalTokens,
      failure_count: todayFailureCount,
    },
    total: {
      request_count: asInt(apiSnapshot?.total_requests),
      total_tokens: asInt(apiSnapshot?.total_tokens),
      failure_count: totalFailureCount,
    },
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

  let dashboardTimeZone
  try {
    dashboardTimeZone = resolveTimeZone(process.env.DASHBOARD_TIMEZONE)
  } catch (error) {
    res.status(500).json({ error: error.message })
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
    const stats = buildStats(usagePayload, apiKey, dashboardTimeZone)

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
