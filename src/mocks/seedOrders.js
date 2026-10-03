import { ORDER_STATUS, calculateCardFee } from '../domain/orders.js';

const names = [
  '林沐晴',
  '陈知远',
  '王晨曦',
  '李思齐',
  '张悦宁',
  '刘子涵',
  '赵明轩',
  '周予安',
  '吴佳禾',
  '徐清和',
  '孙文博',
  '马雨桐',
  '朱星辰',
  '胡若溪',
  '郭嘉树',
  '何欣然',
  '高景行',
  '罗语柔',
  '郑慕白',
  '梁诗雨',
  '谢嘉宁',
  '宋云舟',
  '唐初夏',
  '许书言',
  '韩清扬',
  '冯若兰',
  '邓星野',
  '曹知夏',
  '彭锦程',
  '曾念安',
  '萧承泽',
  '田映月',
  '董亦凡',
  '袁可欣',
  '潘明朗',
  '于乐瑶',
];

export function createSeedOrders(now = Date.now()) {
  const statuses = Object.values(ORDER_STATUS);
  return names.map((memberName, index) => {
    const sequence = index + 1;
    const years = (index % 10) + 1;
    const order = {
      id: `order-${sequence}`,
      orderNo: `GYM${String(sequence).padStart(8, '0')}`,
      memberName,
      phone: `1380000${String(sequence).padStart(4, '0')}`,
      years,
      amount: calculateCardFee(years),
      status: statuses[index % statuses.length],
      createdAt: new Date(now - (names.length - index) * 60 * 60 * 1000).toISOString(),
      remark: '模拟订单，仅用于演示',
    };
    if (index === 0) order.amount = 0;
    if (index === 1 || index === 10) order.amount = null;
    if (index === 2) delete order.amount;
    if (index === 3) order.amount = '';
    return order;
  });
}
