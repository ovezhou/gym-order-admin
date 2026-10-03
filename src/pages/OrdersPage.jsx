import { Alert, Button, Card, Empty, Form, Input, Space, Table, Tabs, Typography } from 'antd';
import { useNavigate } from 'react-router';
import useOrders from '../hooks/useOrders.js';
import { ORDER_TABS } from '../domain/orders.js';
import OrderStatusTag from '../components/OrderStatusTag';
import { formatAmount, formatDateTime } from '../utils/format.js';

const columns = [
  { title: '订单号', dataIndex: 'orderNo', width: 165, className: 'order-number' },
  { title: '会员姓名', dataIndex: 'memberName', width: 125, ellipsis: true },
  { title: '购卡年限', dataIndex: 'years', width: 100, render: (years) => `${years} 年` },
  {
    title: '订单金额（元）',
    dataIndex: 'amount',
    width: 145,
    align: 'right',
    className: 'order-amount',
    render: formatAmount,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (status) => <OrderStatusTag status={status} />,
  },
  { title: '创建时间', dataIndex: 'createdAt', width: 185, render: formatDateTime },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right',
    render: () => <Typography.Text type="secondary">—</Typography.Text>,
  },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const {
    query,
    items,
    total,
    loading,
    error,
    changeTab,
    search,
    resetSearch,
    changePage,
    refresh,
  } = useOrders();

  function handleReset() {
    form.resetFields();
    resetSearch();
  }

  return (
    <>
      <div className="orders-toolbar">
        <Typography.Text type="secondary">查询与跟进会员办卡订单</Typography.Text>
        <Space>
          <Button onClick={refresh} disabled={loading}>
            刷新
          </Button>
          <Button type="primary" onClick={() => navigate('/orders/new')}>
            新建订单
          </Button>
        </Space>
      </div>
      <Card className="orders-card">
        <Tabs
          activeKey={query.tab}
          onChange={changeTab}
          items={ORDER_TABS.map(({ key, label }) => ({ key, label }))}
        />
        <Form
          form={form}
          name="order-search"
          layout="vertical"
          className="order-search"
          onFinish={search}
        >
          <Form.Item label="订单号" name="orderNo">
            <Input placeholder="输入完整订单号" allowClear autoComplete="off" />
          </Form.Item>
          <Form.Item label="会员姓名" name="memberName">
            <Input placeholder="输入姓名关键词" allowClear autoComplete="off" />
          </Form.Item>
          <Form.Item className="search-actions">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
        <div className="orders-meta" aria-live="polite">
          <Typography.Text>{loading ? '查询中…' : `共 ${total} 笔匹配订单`}</Typography.Text>
          <Typography.Text type="secondary">按创建时间：最新优先</Typography.Text>
        </div>
        {error && (
          <Alert
            className="orders-error"
            type="error"
            showIcon
            message="订单查询失败"
            description={error}
            action={
              <Button size="small" onClick={refresh}>
                重试
              </Button>
            }
          />
        )}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          size="middle"
          scroll={{ x: 940 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={error ? '数据暂不可用' : '没有匹配的订单'}
              />
            ),
          }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (count) => `共 ${count} 条`,
            position: ['bottomRight'],
          }}
          onChange={(pagination) => changePage(pagination.current, pagination.pageSize)}
        />
      </Card>
    </>
  );
}
