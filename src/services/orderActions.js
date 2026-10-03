import {
  ORDER_ACTION_RULES,
  getInvalidOrderNumbers,
  getRenewalYearsError,
} from '../domain/orderActions.js';

export class OrderActionError extends Error {
  constructor(message, invalidOrderNumbers = []) {
    super(message);
    this.name = 'OrderActionError';
    this.invalidOrderNumbers = invalidOrderNumbers;
  }
}

export async function prepareOrderAction(api, type, ids, { signal } = {}) {
  const rule = ORDER_ACTION_RULES[type];
  if (!rule) throw new OrderActionError('不支持的订单操作');
  if (!ids.length) throw new OrderActionError('请至少选择一笔订单');
  // Always fetch current records instead of relying on the table's cached rows.
  const { items } = await api.lookup([...new Set(ids)], { signal });
  const invalid = getInvalidOrderNumbers(type, items);
  if (invalid.length) throw new OrderActionError(rule.requirement, invalid);
  return { type, orders: items };
}

export function submitOrderAction(api, operation, years) {
  const ids = operation.orders.map((order) => order.id);
  if (operation.type === 'renew') {
    const error = getRenewalYearsError(years);
    if (error) return Promise.reject(new OrderActionError(error));
    return api.renew(ids, years);
  }
  if (operation.type === 'cancel') return api.cancel(ids);
  return Promise.reject(new OrderActionError('不支持的订单操作'));
}
