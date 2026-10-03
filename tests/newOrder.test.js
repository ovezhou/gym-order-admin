import test from 'node:test';
import assert from 'node:assert/strict';
import { getNewOrderErrors, normalizeNewOrder } from '../src/domain/newOrder.js';
import { createOrderDatabase } from '../src/mocks/orderDatabase.js';

const values = { memberName: '测试会员', phone: '13800000123', years: 1 };

test('表单和接口共用必填、手机号、整数与长度规则', () => {
  assert.deepEqual(Object.keys(getNewOrderErrors({})), ['memberName', 'phone', 'years']);
  for (const [name, invalidValues] of Object.entries({
    memberName: [' ', '王', '名'.repeat(31)],
    phone: ['123', '12800000123', '138000001234'],
    years: [0, 11, 1.5, '5', NaN],
    remark: ['字'.repeat(201)],
  })) {
    for (const value of invalidValues) {
      assert.ok(getNewOrderErrors({ ...values, [name]: value })[name]);
    }
  }
  assert.deepEqual(getNewOrderErrors({ ...values, years: 10, remark: '字'.repeat(200) }), {});
});

test('按 Unicode 码点统计姓名和备注，允许边界长度；去除姓名和手机号首尾空格', () => {
  const input = {
    memberName: ` ${'𠮷'.repeat(30)} `,
    phone: ' 13800000123 ',
    years: 5,
    remark: '😀'.repeat(200),
    amount: 1,
    status: 'completed',
  };
  assert.deepEqual(getNewOrderErrors(input), {});
  const normalized = normalizeNewOrder(input);
  assert.equal([...normalized.memberName].length, 30);
  assert.equal(normalized.phone, '13800000123');
  assert.equal(Object.hasOwn(normalized, 'amount'), false);
  assert.equal(Object.hasOwn(normalized, 'status'), false);
  assert.deepEqual(getNewOrderErrors({ ...input, memberName: '𠮷'.repeat(31) }), {
    memberName: '会员姓名必须为 2～30 个字符',
  });
  assert.ok(getNewOrderErrors({ ...input, remark: '😀'.repeat(201) }).remark);
});

test('共享规则接受的表单可创建并在第一页查询，五年新卡费用为 6000 元', () => {
  const database = createOrderDatabase({ now: () => Date.parse('2026-10-02T10:00:00Z') });
  const input = { ...values, memberName: ' 测试会员 ', years: 5 };
  assert.deepEqual(getNewOrderErrors(input), {});
  const created = database.create(normalizeNewOrder(input));
  assert.equal(created.amount, 6000);
  assert.equal(created.remark, '');
  assert.equal(created.memberName, '测试会员');
  assert.equal(created.status, 'pending_review');
  assert.equal(database.list().items[0].id, created.id);
  assert.equal(database.list().total, 37);
});
