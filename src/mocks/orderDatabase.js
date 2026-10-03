import { ORDER_STATUS, ORDER_TABS, calculateCardFee, isValidYears } from '../domain/orders.js';
import { createSeedOrders } from './seedOrders.js';
import { getNewOrderErrors, normalizeNewOrder } from '../domain/newOrder.js';

export class MockApiError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.name = 'MockApiError';
    this.status = status;
    this.details = details;
  }
}

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const input = value ?? fallback;
  if (!['number', 'string'].includes(typeof input) || String(input).trim() === '') {
    throw new MockApiError('分页参数必须为正整数');
  }
  const parsed = Number(input);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new MockApiError(`分页参数必须为 1～${max} 的整数`);
  }
  return parsed;
}

function searchText(value) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new MockApiError('搜索条件必须为文本');
  return value.trim();
}

function validateNewOrder(payload) {
  const fields = getNewOrderErrors(payload);
  if (Object.keys(fields).length)
    throw new MockApiError(Object.values(fields).join('；'), 400, { fields });
  return normalizeNewOrder(payload);
}

export function createOrderDatabase({ now = () => Date.now() } = {}) {
  let orders = createSeedOrders(now());
  let sequence = orders.length;

  function filtered(params = {}) {
    const tab = ORDER_TABS.find((item) => item.key === (params.tab ?? 'all'));
    if (!tab) throw new MockApiError('不支持的状态筛选');
    const orderNo = searchText(params.orderNo);
    const memberName = searchText(params.memberName).toLocaleLowerCase();
    return orders
      .filter((order) => !tab.statuses || tab.statuses.includes(order.status))
      .filter((order) => !orderNo || order.orderNo === orderNo)
      .filter((order) => !memberName || order.memberName.toLocaleLowerCase().includes(memberName))
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.orderNo.localeCompare(a.orderNo),
      );
  }

  function findSelection(ids) {
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== 'string' || !id.trim())
    ) {
      throw new MockApiError('请至少选择一笔有效订单');
    }
    const uniqueIds = [...new Set(ids)];
    const index = new Map(orders.map((order) => [order.id, order]));
    const missingIds = uniqueIds.filter((id) => !index.has(id));
    if (missingIds.length)
      throw new MockApiError('部分订单不存在，请刷新后重试', 404, { missingIds });
    return uniqueIds.map((id) => index.get(id));
  }

  function validateSelection(selection, allowed, action) {
    const invalidOrderNumbers = selection
      .filter((order) => !allowed.includes(order.status))
      .map((order) => order.orderNo);
    if (invalidOrderNumbers.length) {
      throw new MockApiError(`以下订单不能${action}：${invalidOrderNumbers.join('、')}`, 409, {
        invalidOrderNumbers,
      });
    }
  }

  return {
    list(params = {}) {
      const page = positiveInteger(params.page, 1);
      const pageSize = positiveInteger(params.pageSize, 10, 100);
      const matches = filtered(params);
      return {
        items: structuredClone(matches.slice((page - 1) * pageSize, page * pageSize)),
        total: matches.length,
        page,
        pageSize,
      };
    },
    all(params = {}) {
      const matches = filtered(params);
      return { items: structuredClone(matches), total: matches.length };
    },
    lookup(ids) {
      return { items: structuredClone(findSelection(ids)) };
    },
    create(payload) {
      const values = validateNewOrder(payload);
      const nextSequence = sequence + 1;
      const order = {
        ...values,
        id: `order-${nextSequence}`,
        orderNo: `GYM${String(nextSequence).padStart(8, '0')}`,
        amount: calculateCardFee(values.years),
        status: ORDER_STATUS.PENDING_REVIEW,
        createdAt: new Date(now()).toISOString(),
      };
      orders.push(order);
      sequence = nextSequence;
      return structuredClone(order);
    },
    renew({ ids, years }) {
      if (!isValidYears(years)) throw new MockApiError('续卡年限必须为 1～10 的整数');
      const selection = findSelection(ids);
      validateSelection(selection, [ORDER_STATUS.EXPIRED], '续卡');
      const feePerOrder = calculateCardFee(years, { renewal: true });
      // Validate the whole batch before applying any write.
      for (const order of selection) {
        order.years += years;
        if (typeof order.amount === 'number' && Number.isFinite(order.amount))
          order.amount += feePerOrder;
        order.status = ORDER_STATUS.PENDING_REVIEW;
      }
      return {
        items: structuredClone(selection),
        feePerOrder,
        totalFee: feePerOrder * selection.length,
      };
    },
    cancel({ ids }) {
      const selection = findSelection(ids);
      validateSelection(
        selection,
        [ORDER_STATUS.PENDING_CARD, ORDER_STATUS.PENDING_SHIPPING],
        '撤单',
      );
      for (const order of selection) order.status = ORDER_STATUS.CANCELLED;
      return { items: structuredClone(selection) };
    },
    reset() {
      orders = createSeedOrders(now());
      sequence = orders.length;
    },
  };
}
