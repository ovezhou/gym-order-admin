import axios from 'axios';

export function createHttpClient({
  baseURL = '/api',
  getToken = () => null,
  notifyError = () => {},
  onUnauthorized = () => {},
} = {}) {
  const client = axios.create({ baseURL, timeout: 15000 });
  let lastToken = null;
  let unauthorizedHandled = false;

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
      if (lastToken !== token) {
        unauthorizedHandled = false;
        lastToken = token;
      }
    } else {
      config.headers.delete('Authorization');
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (axios.isCancel(error)) return Promise.reject(error);
      const status = error.response?.status;
      if (status === 401) {
        const sentToken = error.config?.headers?.get?.('Authorization')?.slice(7) ?? null;
        const currentToken = getToken();
        // A late 401 for a previous session must not sign out a newly logged-in user.
        const staleSession = currentToken && sentToken !== currentToken;
        if (!staleSession && !unauthorizedHandled) {
          unauthorizedHandled = true;
          notifyError('登录已失效，请重新登录');
          try {
            onUnauthorized();
          } catch {
            /* Preserve the original request error. */
          }
        }
      } else {
        const serverMessage = error.response?.data?.message;
        const message =
          typeof serverMessage === 'string' && serverMessage.trim()
            ? serverMessage
            : ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)
              ? '请求超时，请稍后重试'
              : status >= 500
                ? '服务暂时不可用，请稍后重试'
                : status
                  ? '请求失败，请稍后重试'
                  : '网络异常，请稍后重试';
        notifyError(message);
      }
      return Promise.reject(error);
    },
  );
  return client;
}
