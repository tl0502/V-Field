import { SessionRequestError } from '@vquan/session-core'
import type { SessionRequestOptions } from '@vquan/session-core'
import { testApiBaseUrl } from './config'

export async function requestApi<T>(path: string, options: SessionRequestOptions = {}): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('invalid_api_path')
  const header: Record<string, string> = { 'x-vquan-audience': 'miniprogram' }
  if (options.body !== undefined) header['content-type'] = 'application/json'
  if (options.token) {
    header.Authorization = `Bearer ${options.token}`
    header['x-vquan-session'] = options.token
  }
  const response = await uni.request({
    url: `${testApiBaseUrl}${path}${path.includes('?') ? '&' : '?'}audience=miniprogram`,
    method: options.method ?? 'GET',
    header,
    data: options.body,
    dataType: 'json',
    timeout: 15000
  })
  let data: T & { error?: string; issues?: string[] }
  try { data = (typeof response.data === 'string' ? JSON.parse(response.data) : response.data) as typeof data }
  catch { throw new SessionRequestError('invalid_response', response.statusCode) }
  if (response.statusCode >= 400) throw new SessionRequestError(data?.error || `http_${response.statusCode}`, response.statusCode, data?.issues)
  return data
}
