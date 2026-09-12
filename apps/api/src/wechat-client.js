const code2SessionEndpoint = 'https://api.weixin.qq.com/sns/jscode2session';

export class WechatApiError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = 'WechatApiError';
    this.wechatCode = code;
    this.retryable = retryable;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new WechatApiError('network_error', '微信接口返回了无效响应', { retryable: true });
  }
}

function assertWechatResponse(data) {
  const rawCode = data.errcode;
  if (rawCode !== undefined && rawCode !== null && Number(rawCode) !== 0) {
    const code = Number(rawCode);
    const retryable = code === -1 || code === 45009 || code >= 50000;
    throw new WechatApiError(code, String(data.errmsg || '微信接口调用失败'), { retryable });
  }

  return data;
}

export function createWechatClient({ appId, appSecret, fetchImpl = fetch } = {}) {
  async function code2Session(code) {
    if (!appId || !appSecret) {
      throw new WechatApiError('config_missing', '微信登录配置缺失');
    }

    const url = new URL(code2SessionEndpoint);
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let response;
    try {
      response = await fetchImpl(url);
    } catch {
      throw new WechatApiError('network_error', '微信登录接口不可用', { retryable: true });
    }

    const data = assertWechatResponse(await readJson(response));

    if (!data.openid) {
      throw new WechatApiError('invalid_response', '微信登录响应缺少身份信息');
    }

    return {
      openid: String(data.openid),
      unionid: data.unionid ? String(data.unionid) : null
    };
  }

  return { code2Session };
}
