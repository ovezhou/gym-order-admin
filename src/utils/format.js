import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(value) {
  if (
    !['number', 'string'].includes(typeof value) ||
    (typeof value === 'string' && value.trim() === '')
  )
    return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? moneyFormatter.format(amount) : '—';
}

export function formatDateTime(value) {
  if (value == null || value === '') return '—';
  const date = dayjs(value);
  return date.isValid() ? date.tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : '—';
}
