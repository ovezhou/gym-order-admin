import { STATUS_META } from '../domain/orders.js';
import { assertExportableOrders } from '../domain/orderExport.js';
import { formatAmount, formatDateTime } from './format.js';

export function escapeCsvCell(value, { protectFormula = true } = {}) {
  let text = String(value ?? '');
  if (protectFormula && (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text))) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildOrdersCsv(orders) {
  // Validate the entire range before serializing any records.
  assertExportableOrders(orders);
  const sorted = [...orders].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      String(b.orderNo).localeCompare(String(a.orderNo)),
  );
  const rows = [
    ['订单号', '会员姓名', '购卡年限', '订单金额（元）', '状态', '创建时间']
      .map((value) => escapeCsvCell(value))
      .join(','),
  ];
  for (const order of sorted) {
    const amount = formatAmount(order.amount);
    const createdAt = formatDateTime(order.createdAt);
    rows.push(
      [
        escapeCsvCell(order.orderNo),
        escapeCsvCell(order.memberName),
        escapeCsvCell(Number.isInteger(order.years) ? order.years : '', { protectFormula: false }),
        escapeCsvCell(amount === '—' ? '' : amount, { protectFormula: false }),
        escapeCsvCell(STATUS_META[order.status].label),
        escapeCsvCell(createdAt === '—' ? '' : createdAt),
      ].join(','),
    );
  }
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

export function createExportFilename(now = new Date()) {
  const timestamp = formatDateTime(now).replaceAll('-', '').replaceAll(':', '').replace(' ', '_');
  return `健身房订单_${timestamp}.csv`;
}
