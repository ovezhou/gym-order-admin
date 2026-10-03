import AxiosMockAdapter from 'axios-mock-adapter';
import { createOrderDatabase, MockApiError } from './orderDatabase.js';

function parseBody(config) {
  let payload;
  try {
    payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  } catch {
    throw new MockApiError('请求内容不是有效的 JSON');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new MockApiError('请求内容必须为对象');
  }
  return payload;
}

export function installMockApi(
  client,
  { database = createOrderDatabase(), delayResponse = 250 } = {},
) {
  const mock = new AxiosMockAdapter(client, { delayResponse });
  const reply =
    (operation, successStatus = 200) =>
    (config) => {
      const authorization = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
      if (!/^Bearer mock-\S+$/.test(authorization ?? ''))
        return [401, { message: '登录已失效，请重新登录' }];
      try {
        return [successStatus, operation(config)];
      } catch (error) {
        if (error instanceof MockApiError)
          return [error.status, { message: error.message, ...error.details }];
        return [500, { message: '模拟服务处理失败，请稍后重试' }];
      }
    };

  mock.onGet('/orders').reply(reply((config) => database.list(config.params)));
  mock.onGet('/orders/all').reply(reply((config) => database.all(config.params)));
  mock.onPost('/orders/lookup').reply(reply((config) => database.lookup(parseBody(config).ids)));
  mock.onPost('/orders').reply(reply((config) => database.create(parseBody(config)), 201));
  mock.onPost('/orders/renew').reply(reply((config) => database.renew(parseBody(config))));
  mock.onPost('/orders/cancel').reply(reply((config) => database.cancel(parseBody(config))));
  mock.onAny().reply(
    reply(() => {
      throw new MockApiError('接口不存在', 404);
    }),
  );
  return { mock, database };
}
