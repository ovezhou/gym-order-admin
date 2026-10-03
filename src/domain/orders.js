export const ORDER_STATUS = {
  PENDING_REVIEW: 'pending_review',
  PENDING_CARD: 'pending_card',
  PENDING_SHIPPING: 'pending_shipping',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export const STATUS_META = {
  [ORDER_STATUS.PENDING_REVIEW]: { label: '待审核', color: 'gold' },
  [ORDER_STATUS.PENDING_CARD]: { label: '待制卡', color: 'blue' },
  [ORDER_STATUS.PENDING_SHIPPING]: { label: '待寄卡', color: 'cyan' },
  [ORDER_STATUS.COMPLETED]: { label: '已完成', color: 'green' },
  [ORDER_STATUS.EXPIRED]: { label: '已到期', color: 'orange' },
  [ORDER_STATUS.CANCELLED]: { label: '已取消', color: 'red' },
};

export const ORDER_TABS = [
  { key: 'all', label: '全部', statuses: null },
  {
    key: 'in_progress',
    label: '进行中',
    statuses: [
      ORDER_STATUS.PENDING_REVIEW,
      ORDER_STATUS.PENDING_CARD,
      ORDER_STATUS.PENDING_SHIPPING,
    ],
  },
  { key: 'expired', label: '已到期', statuses: [ORDER_STATUS.EXPIRED] },
  { key: 'completed', label: '已完成', statuses: [ORDER_STATUS.COMPLETED] },
  { key: 'cancelled', label: '已取消', statuses: [ORDER_STATUS.CANCELLED] },
];

export const CARD_PRICE_PER_YEAR = 1200;
export const isValidYears = (years) => Number.isInteger(years) && years >= 1 && years <= 10;

export function calculateCardFee(years, { renewal = false } = {}) {
  if (!isValidYears(years)) return null;
  const price = years * CARD_PRICE_PER_YEAR;
  return renewal && years >= 5 ? (price * 8) / 10 : price;
}
