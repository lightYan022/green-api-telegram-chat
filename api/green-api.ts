export const config = {
  runtime: 'edge',
}

const isAllowedGreenApiHost = (hostname: string): boolean =>
  hostname === 'api.green-api.com' || hostname.endsWith('.api.green-api.com')

const isSafeApiPath = (apiPath: string): boolean =>
  apiPath.startsWith('/') && !apiPath.startsWith('//') && !apiPath.includes('\\')

const jsonError = (message: string, status: number): Response =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const handler = async (request: Request): Promise<Response> => {
  const apiUrlRaw = request.headers.get('x-green-api-url')
  const apiPath = request.headers.get('x-green-api-path')

  if (!apiUrlRaw || !apiPath) {
    return jsonError('Не указан apiUrl', 400)
  }

  let parsedApiUrl: URL
  try {
    parsedApiUrl = new URL(apiUrlRaw)
  } catch {
    return jsonError('Некорректный apiUrl', 400)
  }

  if (parsedApiUrl.protocol !== 'https:' || !isAllowedGreenApiHost(parsedApiUrl.hostname)) {
    return jsonError('apiUrl должен быть доменом GREEN-API', 400)
  }

  if (!isSafeApiPath(apiPath)) {
    return jsonError('Некорректный путь GREEN-API', 400)
  }

  const origin = parsedApiUrl.origin + parsedApiUrl.pathname.replace(/\/$/, '')
  const targetUrl = `${origin}${apiPath}`

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }

  const upstreamInit: RequestInit = {
    method: request.method,
    headers,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    upstreamInit.body = await request.arrayBuffer()
  }

  const upstream = await fetch(targetUrl, upstreamInit)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    },
  })
}

export default handler
