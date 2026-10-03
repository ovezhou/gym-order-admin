import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../src/services/createHttpClient.js';
import { createOrdersApi } from '../src/api/orders.js';
import { installMockApi } from '../src/mocks/installMockApi.js';
import { calculateRenewalQuote, getRenewalYearsError } from '../src/domain/orderActions.js';
import {
  OrderActionError,
  prepareOrderAction,
  submitOrderAction,
} from '../src/services/orderActions.js';

function setup(t) {
  const client = createHttpClient({ getToken: () => 'mock-actions' });
  const { mock } = installMockApi(client, { delayResponse: 0 });
  t.after(() => mock.restore());
  return createOrdersApi(client);
}

test('跨页订单按 ID 查询最新数据、去重后续卡，报价与接口实收一致', async (t) => {
  const api = setup(t);
  const first = (await api.list({ page: 1 })).items.find((order) => order.status === 'expired');
  const second = (await api.list({ page: 2 })).items.find((order) => order.status === 'expired');
  const operation = await prepareOrderAction(api, 'renew', [first.id, second.id, first.id]);
  assert.equal(operation.orders.length, 2);
  const quote = calculateRenewalQuote(5, operation.orders.length);
  assert.deepEqual(quote, { feePerOrder: 4800, totalFee: 9600, discountApplied: true });
  const result = await submitOrderAction(api, operation, 5);
  assert.equal(result.totalFee, quote.totalFee);
  assert.ok(result.items.every((order) => order.status === 'pending_review'));
  const current = (await api.lookup([first.id, second.id])).items;
  assert.deepEqual(
    current.map((order) => order.years),
    [first.years + 5, second.years + 5],
  );
});

test('续卡和撤单预检列出全部非法订单号，整批未写入', async (t) => {
  const api = setup(t);
  for (const [type, ids, invalid] of [
    ['renew', ['order-35', 'order-34', 'order-36'], ['GYM00000034', 'GYM00000036']],
    ['cancel', ['order-33', 'order-35', 'order-31'], ['GYM00000035', 'GYM00000031']],
  ]) {
    const before = await api.lookup(ids);
    await assert.rejects(prepareOrderAction(api, type, ids), (error) => {
      assert.ok(error instanceof OrderActionError);
      assert.deepEqual(error.invalidOrderNumbers, invalid);
      return true;
    });
    assert.deepEqual(await api.lookup(ids), before);
  }
  await assert.rejects(prepareOrderAction(api, 'renew', []), /至少选择/);
});

test('确认时再校验最新状态，预检后变化不会造成部分续卡', async (t) => {
  const api = setup(t);
  const operation = await prepareOrderAction(api, 'renew', ['order-35', 'order-23']);
  await api.renew(['order-35'], 1);
  const before = await api.lookup(['order-35', 'order-23']);
  await assert.rejects(
    submitOrderAction(api, operation, 5),
    (error) =>
      error.response?.status === 409 &&
      error.response.data.invalidOrderNumbers.includes('GYM00000035'),
  );
  assert.deepEqual(await api.lookup(['order-35', 'order-23']), before);
  await assert.rejects(prepareOrderAction(api, 'renew', ['order-35']), (error) =>
    error.invalidOrderNumbers.includes('GYM00000035'),
  );
});

test('待制卡、待寄卡跨页撤单成功，再次确认同批次会被接口拒绝', async (t) => {
  const api = setup(t);
  const operation = await prepareOrderAction(api, 'cancel', ['order-33', 'order-20']);
  const result = await submitOrderAction(api, operation);
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every((order) => order.status === 'cancelled'));
  const current = await api.lookup(['order-33', 'order-20']);
  await assert.rejects(
    submitOrderAction(api, operation),
    (error) => error.response?.status === 409,
  );
  assert.deepEqual(await api.lookup(['order-33', 'order-20']), current);
});

test('续卡年限必填，整数边界及折扣门槛一致，无效输入不发送写请求', async () => {
  let writes = 0;
  const api = {
    renew: () => {
      writes++;
    },
  };
  const operation = { type: 'renew', orders: [{ id: 'order-35' }] };
  assert.equal(getRenewalYearsError(undefined), '请输入续卡年限');
  for (const years of [null, 0, 11, 1.5, '5', NaN]) {
    assert.ok(getRenewalYearsError(years));
    assert.equal(calculateRenewalQuote(years, 2), null);
    await assert.rejects(submitOrderAction(api, operation, years), OrderActionError);
  }
  assert.equal(writes, 0);
  assert.deepEqual(calculateRenewalQuote(4, 2), {
    feePerOrder: 4800,
    totalFee: 9600,
    discountApplied: false,
  });
  assert.deepEqual(calculateRenewalQuote(10, 1), {
    feePerOrder: 9600,
    totalFee: 9600,
    discountApplied: true,
  });
  assert.equal(calculateRenewalQuote(1, 0), null);
});
