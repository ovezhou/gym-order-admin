import assert from 'node:assert/strict';
import { test } from 'node:test';

let importId = 0;
function storage(seed = null) {
  const values = new Map(seed ? [['gym-order-session', seed]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

async function freshStore(browserStorage) {
  globalThis.localStorage = browserStorage;
  return import(`../src/stores/authStore.js?test=${++importId}`);
}

test('login persists a mock token and username, and refresh restores the same session', async () => {
  const browserStorage = storage();
  const { useAuthStore, SESSION_KEY } = await freshStore(browserStorage);
  assert.equal(useAuthStore.getState().token, null);
  useAuthStore.getState().login('  coach  ');
  const saved = JSON.parse(browserStorage.getItem(SESSION_KEY));
  assert.equal(saved.username, 'coach');
  assert.match(saved.token, /^mock-.+/);
  assert.deepEqual(Object.keys(saved).sort(), ['token', 'username']);
  const refreshed = await freshStore(browserStorage);
  assert.equal(refreshed.useAuthStore.getState().token, saved.token);
  assert.equal(refreshed.useAuthStore.getState().username, 'coach');
});

test('logout removes persisted credentials and a refreshed app stays signed out', async () => {
  const browserStorage = storage();
  const { useAuthStore, SESSION_KEY } = await freshStore(browserStorage);
  useAuthStore.getState().login('admin');
  useAuthStore.getState().logout();
  assert.equal(browserStorage.getItem(SESSION_KEY), null);
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useAuthStore.getState().username, null);
  const refreshed = await freshStore(browserStorage);
  assert.equal(refreshed.useAuthStore.getState().token, null);
});

test('corrupt or incomplete saved sessions cannot grant access', async () => {
  for (const saved of [
    '{broken',
    'null',
    '{"token":"mock-test"}',
    '{"token":"","username":"admin"}',
  ]) {
    const browserStorage = storage(saved);
    const { useAuthStore, SESSION_KEY } = await freshStore(browserStorage);
    assert.equal(useAuthStore.getState().token, null);
    assert.equal(browserStorage.getItem(SESSION_KEY), null);
  }
});

test('storage write failure cannot create an in-memory authenticated session', async () => {
  const browserStorage = storage();
  browserStorage.setItem = () => {
    throw new Error('storage denied');
  };
  const { useAuthStore } = await freshStore(browserStorage);
  assert.throws(() => useAuthStore.getState().login('admin'), /storage denied/);
  assert.equal(useAuthStore.getState().token, null);
});
