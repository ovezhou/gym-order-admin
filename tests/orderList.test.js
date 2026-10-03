import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderListState, orderListReducer } from '../src/hooks/orderListState.js';
import { formatAmount, formatDateTime } from '../src/utils/format.js';

test('金额保留两位小数、千分位和零元，缺失值不当作零', () => {
  assert.equal(formatAmount(12000), '12,000.00');
  assert.equal(formatAmount(0), '0.00');
  assert.equal(formatAmount('0'), '0.00');
  assert.equal(formatAmount(' 1200.5 '), '1,200.50');
  for (const value of [null, undefined, '', ' ', NaN, Infinity, 'invalid', false]) {
    assert.equal(formatAmount(value), '—');
  }
});

test('创建时间统一按上海时区展示并处理空值', () => {
  assert.equal(formatDateTime('2026-10-01T00:00:00.000Z'), '2026-10-01 08:00:00');
  for (const value of [null, undefined, '', 'invalid']) {
    assert.equal(formatDateTime(value), '—');
  }
});

test('Tab、搜索、重置和每页条数改变会回到第一页，保留应保留的条件', () => {
  let state = createOrderListState();
  state = orderListReducer(state, { type: 'page', page: 3, pageSize: 10 });
  state = orderListReducer(state, {
    type: 'search',
    values: { orderNo: ' GYM00000001 ', memberName: ' 张 ' },
  });
  assert.deepEqual(state.query, {
    tab: 'all',
    orderNo: 'GYM00000001',
    memberName: '张',
    page: 1,
    pageSize: 10,
  });
  state = orderListReducer(state, { type: 'page', page: 2, pageSize: 10 });
  state = orderListReducer(state, { type: 'tab', tab: 'expired' });
  assert.equal(state.query.page, 1);
  assert.equal(state.query.orderNo, 'GYM00000001');
  state = orderListReducer(state, { type: 'reset' });
  assert.equal(state.query.tab, 'expired');
  assert.equal(state.query.orderNo, '');
  assert.equal(state.query.memberName, '');
  state = orderListReducer(state, { type: 'page', page: 2, pageSize: 20 });
  assert.equal(state.query.page, 1);
  assert.equal(state.query.pageSize, 20);
});

test('旧查询的成功和失败均不会覆盖当前查询，包括刷新后迟到的结果', () => {
  let state = createOrderListState();
  const oldQuery = state.query;
  state = orderListReducer(state, { type: 'tab', tab: 'completed' });
  const currentState = state;
  state = orderListReducer(state, {
    type: 'success',
    query: oldQuery,
    result: { items: [{ id: 'old' }], total: 1 },
  });
  assert.equal(state, currentState);
  state = orderListReducer(state, { type: 'failure', query: oldQuery, message: '旧错误' });
  assert.equal(state, currentState);
  const beforeRefresh = state.query;
  state = orderListReducer(state, { type: 'refresh' });
  const refreshedState = state;
  state = orderListReducer(state, {
    type: 'success',
    query: beforeRefresh,
    result: { items: [{ id: 'old' }], total: 1 },
  });
  assert.equal(state, refreshedState);
  state = orderListReducer(state, {
    type: 'success',
    query: state.query,
    result: { items: [{ id: 'new' }], total: 1 },
  });
  assert.deepEqual(state.items, [{ id: 'new' }]);
  assert.equal(state.loading, false);
});

test('当前查询失败清除加载状态，重试清理错误；数据减少时自动校正越界页', () => {
  let state = createOrderListState();
  state = orderListReducer(state, { type: 'failure', query: state.query, message: '查询失败' });
  assert.equal(state.error, '查询失败');
  assert.equal(state.loading, false);
  state = orderListReducer(state, { type: 'refresh' });
  assert.equal(state.error, null);
  assert.equal(state.loading, true);
  state = orderListReducer(state, { type: 'page', page: 4, pageSize: 10 });
  state = orderListReducer(state, {
    type: 'success',
    query: state.query,
    result: { items: [], total: 18 },
  });
  assert.equal(state.query.page, 2);
  assert.equal(state.loading, true);
  state = orderListReducer(state, {
    type: 'success',
    query: state.query,
    result: { items: [], total: 0 },
  });
  assert.equal(state.query.page, 1);
});
