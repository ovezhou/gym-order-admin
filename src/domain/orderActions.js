import { ORDER_STATUS, calculateCardFee, isValidYears } from './orders.js';

export const ORDER_ACTION_RULES = {
  renew: { label: '续卡', allowed: [ORDER_STATUS.EXPIRED], requirement: '仅已到期订单可以续卡。' },
  cancel: {
    label: '撤单',
    allowed: [ORDER_STATUS.PENDING_CARD, ORDER_STATUS.PENDING_SHIPPING],
    requirement: '仅待制卡、待寄卡订单可以撤单。',
  },
};

export function getInvalidOrderNumbers(type, orders) {
  const rule = ORDER_ACTION_RULES[type];
  if (!rule) throw new Error('不支持的订单操作');
  return orders
    .filter((order) => !rule.allowed.includes(order.status))
    .map((order) => order.orderNo);
}

export function getRenewalYearsError(years) {
  if (years == null) return '请输入续卡年限';
  return isValidYears(years) ? null : '续卡年限必须为 1～10 的整数';
}

export function calculateRenewalQuote(years, count) {
  const feePerOrder = calculateCardFee(years, { renewal: true });
  if (feePerOrder == null || !Number.isInteger(count) || count < 1) return null;
  return { feePerOrder, totalFee: feePerOrder * count, discountApplied: years >= 5 };
}
