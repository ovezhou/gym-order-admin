import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHttpClient } from '../src/services/createHttpClient.js';
import { createOrdersApi } from '../src/api/orders.js';
import { installMockApi } from '../src/mocks/installMockApi.js';
import { createOrderDatabase } from '../src/mocks/orderDatabase.js';
import { ORDER_STATUS, calculateCardFee } from '../src/domain/orders.js';

function setup(t) {
  const errors = [];
  const client = createHttpClient({
    getToken: () => 'mock-test',
    notifyError: (message) => errors.push(message),
  });
  const database = createOrderDatabase({ now: () => Date.parse('2026-10-01T04:00:00Z') });
  const { mock } = installMockApi(client, { database, delayResponse: 0 });
  t.after(() => mock.restore());
  return { api: createOrdersApi(client), client, database, errors };
}

const validOrder = { memberName: '测试会员', phone: '13800000123', years: 5, remark: '测试备注' };
const hasStatus = (status) => (error) => error.response?.status === status;

test('seed provides 36 orders, all six statuses, and distinct zero/missing amounts', async (t) => {
  const { api } = setup(t);
  const result = await api.all();
  assert.equal(result.total, 36);
  assert.equal(new Set(result.items.map((order) => order.orderNo)).size, 36);
  assert.deepEqual(
    new Set(result.items.map((order) => order.status)),
    new Set(Object.values(ORDER_STATUS)),
  );
  for (const status of Object.values(ORDER_STATUS))
    assert.equal(result.items.filter((order) => order.status === status).length, 6);
  const byId = new Map(result.items.map((order) => [order.id, order]));
  assert.equal(byId.get('order-1').amount, 0);
  assert.equal(byId.get('order-2').amount, null);
  assert.equal(Object.hasOwn(byId.get('order-3'), 'amount'), false);
  assert.equal(byId.get('order-4').amount, '');
  for (let index = 1; index < result.items.length; index++) {
    assert.ok(
      Date.parse(result.items[index - 1].createdAt) >= Date.parse(result.items[index].createdAt),
    );
  }
});

test('tabs, exact order number, and fuzzy member name combine correctly', async (t) => {
  const { api } = setup(t);
  const progress = await api.all({ tab: 'in_progress' });
  assert.equal(progress.total, 18);
  assert.ok(
    progress.items.every((order) =>
      ['pending_review', 'pending_card', 'pending_shipping'].includes(order.status),
    ),
  );
  for (const tab of ['expired', 'completed', 'cancelled']) {
    const result = await api.all({ tab });
    assert.equal(result.total, 6);
    assert.ok(result.items.every((order) => order.status === tab));
  }
  assert.equal((await api.all({ orderNo: 'GYM00000005' })).total, 1);
  assert.equal((await api.all({ orderNo: 'GYM0000000' })).total, 0);
  const fuzzy = await api.all({ memberName: ' 知 ' });
  assert.equal(fuzzy.total, 2);
  assert.ok(fuzzy.items.every((order) => order.memberName.includes('知')));
  assert.equal(
    (await api.all({ tab: 'expired', orderNo: 'GYM00000005', memberName: '悦' })).total,
    1,
  );
  assert.equal((await api.all({ tab: 'completed', orderNo: 'GYM00000005' })).total, 0);
});

test('pagination returns disjoint pages and the filtered all endpoint ignores paging', async (t) => {
  const { api } = setup(t);
  const first = await api.list({ page: 1, pageSize: 10 });
  const second = await api.list({ page: '2', pageSize: '10' });
  assert.equal(first.total, 36);
  assert.equal(first.items.length, 10);
  assert.equal(second.page, 2);
  assert.equal(second.items.length, 10);
  assert.equal(new Set([...first.items, ...second.items].map((order) => order.id)).size, 20);
  assert.equal((await api.list({ page: 4, pageSize: 10 })).items.length, 6);
  assert.deepEqual((await api.list({ page: 5, pageSize: 10 })).items, []);
  assert.equal((await api.all({ tab: 'expired', page: 1, pageSize: 1 })).items.length, 6);
});

test('invalid query parameters reject rather than silently giving wrong results', async (t) => {
  const { api } = setup(t);
  for (const params of [
    { page: 0 },
    { page: 1.5 },
    { pageSize: 101 },
    { page: true },
    { tab: 'unknown' },
    { memberName: [] },
  ]) {
    await assert.rejects(api.list(params), hasStatus(400));
  }
});

test('create recalculates price and status, appears first, and reset restores seed data', async (t) => {
  const { api, database } = setup(t);
  const created = await api.create({
    ...validOrder,
    memberName: ' 测试会员 ',
    amount: 1,
    status: ORDER_STATUS.COMPLETED,
  });
  assert.equal(created.memberName, '测试会员');
  assert.equal(created.amount, 6000);
  assert.equal(created.status, ORDER_STATUS.PENDING_REVIEW);
  assert.equal((await api.list()).items[0].id, created.id);
  assert.equal((await api.list()).total, 37);
  assert.equal((await api.all({ orderNo: created.orderNo })).total, 1);
  database.reset();
  assert.equal((await api.all()).total, 36);
  assert.equal((await api.all({ orderNo: created.orderNo })).total, 0);
});

test('invalid new orders do not change the database and expose field errors', async (t) => {
  const { api } = setup(t);
  for (const patch of [
    { memberName: '王' },
    { memberName: '名'.repeat(31) },
    { phone: '123' },
    { years: 0 },
    { years: 11 },
    { years: 1.5 },
    { years: '5' },
    { remark: '字'.repeat(201) },
  ]) {
    await assert.rejects(
      api.create({ ...validOrder, ...patch }),
      (error) =>
        error.response?.status === 400 && Object.keys(error.response.data.fields).length > 0,
    );
  }
  assert.equal((await api.all()).total, 36);
});

test('renewal applies discount per order, accumulates years and amount, and changes status', async (t) => {
  const { api } = setup(t);
  const before = (await api.lookup(['order-5', 'order-17'])).items;
  const result = await api.renew(
    before.map((order) => order.id),
    5,
  );
  assert.equal(result.feePerOrder, 4800);
  assert.equal(result.totalFee, 9600);
  const after = (await api.lookup(before.map((order) => order.id))).items;
  for (let index = 0; index < before.length; index++) {
    assert.equal(after[index].years, before[index].years + 5);
    assert.equal(after[index].amount, before[index].amount + 4800);
    assert.equal(after[index].status, ORDER_STATUS.PENDING_REVIEW);
    assert.equal(after[index].createdAt, before[index].createdAt);
  }
  assert.ok(after.some((order) => order.years > 10));
  assert.equal((await api.all({ tab: 'expired' })).total, 4);
  await assert.rejects(api.renew([after[0].id], 1), hasStatus(409));
});

test('mixed-state renewal is atomic and lists ineligible order numbers', async (t) => {
  const { api, errors } = setup(t);
  const ids = ['order-5', 'order-1'];
  const before = await api.lookup(ids);
  await assert.rejects(api.renew(ids, 5), (error) => {
    assert.equal(error.response.status, 409);
    assert.deepEqual(error.response.data.invalidOrderNumbers, ['GYM00000001']);
    return true;
  });
  assert.deepEqual(await api.lookup(ids), before);
  assert.match(errors[0], /GYM00000001/);
});

test('duplicate IDs cannot charge an order twice and missing historical amount stays missing', async (t) => {
  const { api } = setup(t);
  const before = (await api.lookup(['order-11'])).items[0];
  assert.equal(before.amount, null);
  const result = await api.renew(['order-11', 'order-11'], 5);
  assert.equal(result.items.length, 1);
  assert.equal(result.totalFee, 4800);
  const after = (await api.lookup(['order-11'])).items[0];
  assert.equal(after.years, before.years + 5);
  assert.equal(after.amount, null);
});

test('invalid renewal input and missing IDs leave all valid orders unchanged', async (t) => {
  const { api } = setup(t);
  const before = await api.lookup(['order-5']);
  for (const years of [0, 11, 1.5, '5', null])
    await assert.rejects(api.renew(['order-5'], years), hasStatus(400));
  await assert.rejects(api.renew([], 1), hasStatus(400));
  await assert.rejects(
    api.renew(['order-5', 'missing'], 1),
    (error) => error.response?.status === 404 && error.response.data.missingIds.includes('missing'),
  );
  assert.deepEqual(await api.lookup(['order-5']), before);
});

test('cancel updates pending-card and pending-shipping orders without altering amounts or years', async (t) => {
  const { api } = setup(t);
  const ids = ['order-2', 'order-3'];
  const before = (await api.lookup(ids)).items;
  await api.cancel(ids);
  const after = (await api.lookup(ids)).items;
  assert.deepEqual(
    after,
    before.map((order) => ({ ...order, status: ORDER_STATUS.CANCELLED })),
  );
  assert.equal((await api.all({ tab: 'cancelled' })).total, 8);
  await assert.rejects(api.cancel(ids), hasStatus(409));
});

test('mixed-state cancellation is atomic and lists every invalid order number', async (t) => {
  const { api } = setup(t);
  const ids = ['order-2', 'order-1', 'order-4'];
  const before = await api.lookup(ids);
  await assert.rejects(api.cancel(ids), (error) => {
    assert.equal(error.response.status, 409);
    assert.deepEqual(error.response.data.invalidOrderNumbers, ['GYM00000001', 'GYM00000004']);
    return true;
  });
  assert.deepEqual(await api.lookup(ids), before);
});

test('lookup supports records from different pages and returned values cannot mutate stored orders', async (t) => {
  const { api, database } = setup(t);
  const result = await api.lookup(['order-1', 'order-20', 'order-36']);
  assert.equal(result.items.length, 3);
  result.items[0].memberName = '被外部改动';
  const direct = database.lookup(['order-1']);
  direct.items[0].memberName = '再次被改动';
  assert.equal((await api.lookup(['order-1'])).items[0].memberName, '林沐晴');
});

test('unknown endpoints and malformed JSON return explicit errors', async (t) => {
  const { client } = setup(t);
  await assert.rejects(client.get('/unknown'), hasStatus(404));
  await assert.rejects(
    client.post('/orders', '{broken', { headers: { 'Content-Type': 'application/json' } }),
    hasStatus(400),
  );
});

test('new-card and renewal fees have separate discount rules and invalid years have no price', () => {
  assert.equal(calculateCardFee(5), 6000);
  assert.equal(calculateCardFee(4, { renewal: true }), 4800);
  assert.equal(calculateCardFee(5, { renewal: true }), 4800);
  assert.equal(calculateCardFee(10, { renewal: true }), 9600);
  for (const value of [null, 0, 11, 1.5, '5']) assert.equal(calculateCardFee(value), null);
});
