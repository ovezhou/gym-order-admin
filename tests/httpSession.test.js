import assert from 'node:assert/strict';
import { test } from 'node:test';
import { http } from '../src/services/http.js';
import { subscribeHttpEvents } from '../src/services/httpEvents.js';
import { useAuthStore, SESSION_KEY } from '../src/stores/authStore.js';

test('the application HTTP instance clears the real auth store and emits login navigation on 401', async (t) => {
  const values = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const events = [];
  const unsubscribe = subscribeHttpEvents((event) => events.push(event));
  t.after(() => {
    unsubscribe();
    globalThis.localStorage = previousStorage;
  });
  useAuthStore.getState().login('测试管理员');
  assert.ok(values.has(SESSION_KEY));
  useAuthStore.setState({ token: 'expired-token' });
  await assert.rejects(http.get('/orders'), (error) => error.response?.status === 401);
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useAuthStore.getState().username, null);
  assert.equal(values.has(SESSION_KEY), false);
  assert.deepEqual(events, [
    { type: 'error', message: '登录已失效，请重新登录' },
    { type: 'unauthorized' },
  ]);
});
