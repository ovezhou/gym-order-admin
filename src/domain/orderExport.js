import { ORDER_STATUS } from './orders.js';

export const EXPORTABLE_STATUSES = [ORDER_STATUS.COMPLETED, ORDER_STATUS.EXPIRED];

export class OrderExportError extends Error {
  constructor(message, invalidOrderNumbers = []) {
    super(message);
    this.name = 'OrderExportError';
    this.invalidOrderNumbers = invalidOrderNumbers;
  }
}

export function assertExportableOrders(orders) {
  if (!orders.length) throw new OrderExportError('没有可导出的订单，请调整筛选条件');
  const invalid = orders
    .filter((order) => !EXPORTABLE_STATUSES.includes(order.status))
    .map((order) => order.orderNo);
  if (invalid.length) throw new OrderExportError('仅已完成、已到期订单允许导出。', invalid);
}
