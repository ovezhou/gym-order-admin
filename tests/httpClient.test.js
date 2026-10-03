import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { createHttpClient } from '../src/services/createHttpClient.js';
import { installMockApi } from '../src/mocks/installMockApi.js';

test('every request reads the current token and replaces outdated caller headers', async (t) => {
  let token = 'mock-first';
  const client = createHttpClient({ baseURL: '/test-api', getToken: () => token });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  mock
    .onGet('/headers')
    .reply((config) => [
      200,
      { authorization: config.headers.get('Authorization') ?? null, baseURL: config.baseURL },
    ]);
  assert.deepEqual(await client.get('/headers'), {
    authorization: 'Bearer mock-first',
    baseURL: '/test-api',
  });
  token = 'mock-second';
  assert.equal(
    (await client.get('/headers', { headers: { Authorization: 'Bearer old' } })).authorization,
    'Bearer mock-second',
  );
  token = null;
  assert.equal(
    (await client.get('/headers', { headers: { Authorization: 'Bearer old' } })).authorization,
    null,
  );
});

test('business errors notify once and remain rejected for the caller', async (t) => {
  const errors = [];
  const client = createHttpClient({ notifyError: (message) => errors.push(message) });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  mock.onGet('/conflict').reply(409, { message: 'GYM00000001 不能续卡' });
  await assert.rejects(client.get('/conflict'), (error) => error.response?.status === 409);
  assert.deepEqual(errors, ['GYM00000001 不能续卡']);
});

test('network failures and timeouts have clear unified messages', async (t) => {
  const errors = [];
  const client = createHttpClient({ notifyError: (message) => errors.push(message) });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  mock.onGet('/network').networkError();
  mock.onGet('/timeout').timeout();
  mock.onGet('/server').reply(500);
  await assert.rejects(client.get('/network'));
  await assert.rejects(client.get('/timeout'));
  await assert.rejects(client.get('/server'));
  assert.deepEqual(errors, [
    '网络异常，请稍后重试',
    '请求超时，请稍后重试',
    '服务暂时不可用，请稍后重试',
  ]);
});

test('canceled queries do not show an error notification', async (t) => {
  const errors = [];
  const client = createHttpClient({ notifyError: (message) => errors.push(message) });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  mock.onGet('/cancelled-query').reply(200, {});
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(client.get('/cancelled-query', { signal: controller.signal }), (error) =>
    axios.isCancel(error),
  );
  assert.deepEqual(errors, []);
});

test('concurrent 401 responses trigger one logout and a new session can expire independently', async (t) => {
  let token = 'mock-session-one';
  let logoutCount = 0;
  const errors = [];
  const client = createHttpClient({
    getToken: () => token,
    notifyError: (message) => errors.push(message),
    onUnauthorized: () => {
      token = null;
      logoutCount++;
    },
  });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  mock.onGet('/expired').reply(401);
  const results = await Promise.allSettled([client.get('/expired'), client.get('/expired')]);
  assert.ok(results.every((result) => result.status === 'rejected'));
  assert.equal(logoutCount, 1);
  assert.equal(errors.length, 1);
  token = 'mock-session-two';
  await assert.rejects(client.get('/expired'));
  assert.equal(logoutCount, 2);
});

test('a late 401 from the old session cannot clear a newly logged-in session', async (t) => {
  let token = 'mock-old';
  let logoutCount = 0;
  const errors = [];
  const client = createHttpClient({
    getToken: () => token,
    notifyError: (message) => errors.push(message),
    onUnauthorized: () => logoutCount++,
  });
  const mock = new AxiosMockAdapter(client);
  t.after(() => mock.restore());
  let release;
  let started;
  const requestStarted = new Promise((resolve) => {
    started = resolve;
  });
  const reply = new Promise((resolve) => {
    release = resolve;
  });
  mock.onGet('/old-request').reply((config) => {
    assert.equal(config.headers.get('Authorization'), 'Bearer mock-old');
    started();
    return reply;
  });
  const oldRequest = client.get('/old-request');
  await requestStarted;
  token = 'mock-new';
  release([401, {}]);
  await assert.rejects(oldRequest);
  assert.equal(token, 'mock-new');
  assert.equal(logoutCount, 0);
  assert.deepEqual(errors, []);
});

test('mock order endpoints reject absent and malformed bearer tokens', async (t) => {
  let token = null;
  const client = createHttpClient({ getToken: () => token });
  const { mock } = installMockApi(client, { delayResponse: 0 });
  t.after(() => mock.restore());
  for (const value of [null, 'invalid-token', 'mock-']) {
    token = value;
    await assert.rejects(client.get('/orders'), (error) => error.response?.status === 401);
  }
  token = 'mock-valid';
  assert.equal((await client.get('/orders')).total, 36);
});
