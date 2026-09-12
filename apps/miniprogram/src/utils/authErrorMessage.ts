const authErrorCopy: Record<string, string> = {
  invalid_credentials: '账号或密码错误',
  wechat_login_failed: '微信登录失败，请重试',
  wechat_config_missing: '微信登录暂不可用',
  wechat_code_required: '微信登录失败，请重试',
  account_disabled: '账号已停用',
  unauthorized: '登录已失效，请重新登录',
  login_failed: '登录失败'
}

export function authErrorMessage(error: unknown, fallback = '登录失败') {
  const code = error instanceof Error ? error.message : ''
  return authErrorCopy[code] || fallback
}
