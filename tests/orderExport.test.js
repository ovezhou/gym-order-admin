import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrdersCsv, createExportFilename, escapeCsvCell } from '../src/utils/ordersCsv.js';
import { OrderExportError } from '../src/domain/orderExport.js';
import { prepareOrdersExport } from '../src/services/orderExport.js';
import { createHttpClient } from '../src/services/createHttpClient.js';
import { createOrdersApi } from '../src/api/orders.js';
import { installMockApi } from '../src/mocks/installMockApi.js';

const now = new Date('2026-10-02T10:00:00Z');
const order = {
  id: 'test-1',
  orderNo: 'GYM00000001',
  memberName: '测试会员',
  years: 10,
  amount: 12000,
  status: 'completed',
  createdAt: '2026-10-01T00:00:00Z',
  phone: '13800000123',
  remark: '内部备注不导出',
};

function setup(t) {
  const client = createHttpClient({ getToken: () => 'mock-export' });
  const { mock } = installMockApi(client, { delayResponse: 0 });
  t.after(() => mock.restore());
  return createOrdersApi(client);
}

test('CSV 有中文表头、UTF-8 BOM、CRLF、六列，金额零值与空值分开且不含敏感字段', () => {
  const orders = [
    order,
    { ...order, id: 'test-2', orderNo: 'GYM00000002', amount: 0 },
    { ...order, id: 'test-3', orderNo: 'GYM00000003', amount: null },
  ];
  const before = structuredClone(orders);
  const csv = buildOrdersCsv(orders);
  assert.deepEqual([...Buffer.from(csv).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const rows = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(rows[0], '"订单号","会员姓名","购卡年限","订单金额（元）","状态","创建时间"');
  assert.equal(rows.length, 4);
  assert.match(rows[1], /^"GYM00000003".*,"","已完成"/);
  assert.match(rows[2], /,"0\.00",/);
  assert.match(rows[3], /,"12,000\.00",/);
  assert.match(rows[3], /"2026-10-01 08:00:00"$/);
  assert.ok(!csv.includes(order.phone));
  assert.ok(!csv.includes(order.remark));
  assert.deepEqual(orders, before);
  assert.equal(createExportFilename(now), '健身房订单_20261002_180000.csv');
});

test('逗号、双引号、换行及 Unicode 文本正确转义，时间降序不改变源数组', () => {
  const csv = buildOrdersCsv([
    { ...order, memberName: '王,"晨"\r\n曦' },
    { ...order, orderNo: 'GYM00000002', memberName: '𠮷😀', createdAt: '2026-10-02T00:00:00Z' },
  ]);
  assert.ok(csv.indexOf('GYM00000002') < csv.indexOf('GYM00000001'));
  assert.ok(csv.includes('"王,""晨""\r\n曦"'));
  assert.ok(csv.includes('"𠮷😀"'));
  assert.equal(escapeCsvCell(null), '""');
});

test('危险文本加单引号防护，包含前导空白和全角公式前缀；数值格式不受影响', () => {
  for (const value of [
    '=1+1',
    '+SUM(1,2)',
    '-2+3',
    '@SUM(1)',
    ' \t=1',
    '\t文本',
    '\r文本',
    '\n文本',
    '＝1',
    '＋1',
    '－1',
    '＠SUM(1)',
  ]) {
    assert.ok(escapeCsvCell(value).startsWith('"\''), value);
  }
  const csv = buildOrdersCsv([{ ...order, memberName: '=SUM(1,2)', amount: -1200 }]);
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"-1,200.00"'));
  assert.equal(escapeCsvCell('普通会员'), '"普通会员"');
});

test('只要包含禁止或未知状态就阻止全部导出并列出全部订单号，空数据不生成文件', () => {
  assert.throws(() => buildOrdersCsv([]), OrderExportError);
  const invalid = [
    'pending_review',
    'pending_card',
    'pending_shipping',
    'cancelled',
    'unknown',
  ].map((status, index) => ({ ...order, orderNo: `BAD${index}`, status }));
  assert.throws(
    () => buildOrdersCsv([order, ...invalid]),
    (error) => {
      assert.ok(error instanceof OrderExportError);
      assert.deepEqual(
        error.invalidOrderNumbers,
        invalid.map((item) => item.orderNo),
      );
      return true;
    },
  );
});

test('无勾选时读取全部筛选结果，分页参数不传入导出查询', async () => {
  let params;
  const orders = Array.from({ length: 12 }, (_, index) => ({
    ...order,
    id: `test-${index}`,
    orderNo: `GYM${String(index + 1).padStart(8, '0')}`,
  }));
  const api = {
    all: async (query) => {
      params = query;
      return { items: orders };
    },
    lookup: () => {
      throw new Error('不应查询选择记录');
    },
  };
  const file = await prepareOrdersExport(
    api,
    {
      query: { tab: 'completed', orderNo: '', memberName: '测试', page: 2, pageSize: 10 },
      selectedIds: [],
    },
    { now },
  );
  assert.deepEqual(params, { tab: 'completed', orderNo: '', memberName: '测试' });
  assert.equal(file.count, 12);
  assert.equal(file.csv.trimEnd().split('\r\n').length, 13);
  assert.equal(file.scope, '全部筛选结果（含所有分页）');
});

test('勾选范围优先、跨页 ID 去重、每次查询最新状态，续卡后的旧勾选会被拒绝', async (t) => {
  const api = setup(t);
  const file = await prepareOrdersExport(
    api,
    {
      query: { tab: 'cancelled', memberName: '不存在' },
      selectedIds: ['order-34', 'order-22', 'order-34'],
    },
    { now },
  );
  assert.equal(file.count, 2);
  assert.ok(file.csv.includes('GYM00000034'));
  assert.ok(file.csv.includes('GYM00000022'));
  assert.ok(!file.csv.includes('GYM00000028'));
  assert.equal(file.scope, '已勾选 2 笔（含跨页记录）');
  await api.renew(['order-35'], 1);
  await assert.rejects(
    prepareOrdersExport(api, { query: {}, selectedIds: ['order-35', 'order-34'] }),
    (error) => error.invalidOrderNumbers.includes('GYM00000035'),
  );
});

test('实际模拟接口组合筛选正确，空结果或混入非法记录都不生成导出对象', async (t) => {
  const api = setup(t);
  const file = await prepareOrdersExport(
    api,
    { query: { tab: 'completed', memberName: '知' }, selectedIds: [] },
    { now },
  );
  assert.equal(file.count, 1);
  assert.ok(file.csv.includes('曹知夏'));
  await assert.rejects(
    prepareOrdersExport(api, {
      query: { tab: 'completed', memberName: '不存在' },
      selectedIds: [],
    }),
    /没有可导出/,
  );
  await assert.rejects(
    prepareOrdersExport(api, { query: { tab: 'all' }, selectedIds: [] }),
    (error) => error.invalidOrderNumbers.length === 24,
  );
  await assert.rejects(
    prepareOrdersExport(api, { query: {}, selectedIds: ['order-34', 'missing'] }),
    (error) => error.response?.status === 404,
  );
});
