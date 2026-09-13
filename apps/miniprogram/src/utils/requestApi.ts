import { SessionRequestError } from '@vquan/session-core'
import type { SessionRequestOptions } from '@vquan/session-core'
import { cloudRunEnv, cloudRunService } from './config'

// Keep the native CloudRun surface local: full WeChat globals conflict with uni-app types.
declare const wx: {
  cloud?: {
    init(): void
    callContainer(options: {
      config: { env: string }
      path: string
      method: 'GET' | 'POST'
      header: Record<string, string>
      data?: Record<string, unknown>
      dataType: 'text'
      timeout: number
    }): Promise<{ statusCode: number; data: unknown }>
  }
}

let cloudInitialized = false

export async function requestApi<T>(path: string, options: SessionRequestOptions = {}): Promise<T> {
  if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.callContainer !== 'function') {
    throw new Error('wechat_cloud_unavailable')
  }
  // Initialize once before the first request. Each call pins the CloudRun environment below.
  if (!cloudInitialized) {
    wx.cloud.init()
    cloudInitialized = true
  }

  const header: Record<string, string> = {
    'X-WX-SERVICE': cloudRunService,
    'x-vquan-audience': 'miniprogram'
  }
  if (options.body !== undefined) header['content-type'] = 'application/json'
  if (options.token) {
    header.Authorization = `Bearer ${options.token}`
    header['x-vquan-session'] = options.token
  }

  const response = await wx.cloud.callContainer({
    config: { env: cloudRunEnv },
    path: `${path}${path.includes('?') ? '&' : '?'}audience=miniprogram`,
    method: options.method ?? 'GET',
    header,
    data: options.body,
    dataType: 'text',
    timeout: 15000
  })

  let data: T & { error?: string }
  try {
    data = (typeof response.data === 'string' ? JSON.parse(response.data) : response.data) as T & { error?: string }
  } catch {
    throw new SessionRequestError('invalid_response', response.statusCode)
  }
  if (response.statusCode >= 400) {
    throw new SessionRequestError(data?.error || `http_${response.statusCode}`, response.statusCode)
  }
  return data
}
