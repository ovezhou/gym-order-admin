import { Tag } from 'antd';
import { STATUS_META } from '../domain/orders.js';

export default function OrderStatusTag({ status }) {
  const metadata = STATUS_META[status];
  return <Tag color={metadata?.color ?? 'default'}>{metadata?.label ?? '未知状态'}</Tag>;
}
