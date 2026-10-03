import { useState } from 'react';
import { Alert, Button, Card, Empty, Form, Input, Space, Table, Tabs, Typography } from 'antd';
import { useNavigate } from 'react-router';
import useOrders from '../hooks/useOrders.js';
import { ORDER_TABS, ORDER_STATUS } from '../domain/orders.js';
import { ORDER_ACTION_RULES } from '../domain/orderActions.js';
import useOrderActions from '../hooks/useOrderActions.jsx';
import useOrderExport from '../hooks/useOrderExport.jsx';
import OrderActionModal from '../components/OrderActionModal.jsx';
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
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
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
  const orderExport = useOrderExport();

  const actions = useOrderActions((updatedOrders) => {
    const updatedIds = new Set(updatedOrders.map((order) => order.id));
    setSelectedRowKeys((keys) => keys.filter((id) => !updatedIds.has(id)));
    refresh();
  });
  const operationBusy = actions.busy || orderExport.busy;
  const tableColumns = [
    ...columns,
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, order) => (
        <Space size={0}>
          {order.status === ORDER_STATUS.EXPIRED && (
            <Button
              type="link"
              size="small"
              disabled={operationBusy}
              onClick={() => actions.prepare('renew', [order.id])}
            >
              续卡
            </Button>
          )}
          {ORDER_ACTION_RULES.cancel.allowed.includes(order.status) && (
            <Button
              type="link"
              danger
              size="small"
              disabled={operationBusy}
              onClick={() => actions.prepare('cancel', [order.id])}
            >
              撤单
            </Button>
          )}
          {![ORDER_STATUS.EXPIRED, ...ORDER_ACTION_RULES.cancel.allowed].includes(order.status) && (
            <Typography.Text type="secondary">—</Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  function handleReset() {
    form.resetFields();
    resetSearch();
  }

  return (
    <>
      <div className="orders-toolbar">
        <Typography.Text type="secondary">查询与跟进会员办卡订单</Typography.Text>
        <Space>
          <Button onClick={refresh} disabled={loading || orderExport.busy}>
            刷新
          </Button>
          <Button
            type="primary"
            disabled={orderExport.busy}
            onClick={() => navigate('/orders/new')}
          >
            新建订单
          </Button>
        </Space>
      </div>
      <Card className="orders-card">
        <Tabs
          activeKey={query.tab}
          onChange={changeTab}
          items={ORDER_TABS.map(({ key, label }) => ({ key, label, disabled: orderExport.busy }))}
        />
        <Form
          form={form}
          name="order-search"
          layout="vertical"
          className="order-search"
          onFinish={search}
          disabled={orderExport.busy}
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
        <div className="orders-batch-toolbar">
          <Space wrap>
            <Button
              disabled={!selectedRowKeys.length || operationBusy || loading}
              onClick={() => actions.prepare('renew', selectedRowKeys)}
            >
              批量续卡
            </Button>
            <Button
              danger
              disabled={!selectedRowKeys.length || operationBusy || loading}
              onClick={() => actions.prepare('cancel', selectedRowKeys)}
            >
              一键撤单
            </Button>
            <Button
              type="text"
              disabled={!selectedRowKeys.length || operationBusy}
              onClick={() => setSelectedRowKeys([])}
            >
              清空选择
            </Button>
          </Space>
          <Typography.Text type="secondary" aria-live="polite">
            {actions.preparing ? '正在校验订单… ' : ''}已选择 {selectedRowKeys.length}{' '}
            笔（含其他页与筛选）
          </Typography.Text>
        </div>
        <div className="orders-export-bar">
          <Space wrap>
            <Button
              loading={orderExport.busy}
              disabled={loading || actions.busy || !!actions.operation}
              onClick={() => orderExport.exportOrders(query, selectedRowKeys)}
            >
              导出 CSV
            </Button>
            <Typography.Text type="secondary">
              导出范围：
              {selectedRowKeys.length
                ? `已勾选 ${selectedRowKeys.length} 笔（含跨页记录）`
                : '全部筛选结果（含所有分页）'}
            </Typography.Text>
          </Space>
          <Typography.Text type="secondary">仅已完成、已到期可导出</Typography.Text>
        </div>
        {orderExport.receipt && (
          <Alert
            className="orders-export-receipt"
            type="success"
            showIcon
            closable
            onClose={orderExport.clearReceipt}
            message={`已生成 ${orderExport.receipt.count} 笔订单的 CSV`}
            description={`${orderExport.receipt.filename} · ${orderExport.receipt.scope}`}
          />
        )}
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
          columns={tableColumns}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            preserveSelectedRowKeys: true,
            fixed: true,
            columnWidth: 48,
            getCheckboxProps: (order) => ({
              disabled: operationBusy,
              'aria-label': `选择订单 ${order.orderNo}`,
            }),
            getTitleCheckboxProps: () => ({
              disabled: operationBusy || loading,
              'aria-label': '选择当前页全部订单',
            }),
          }}
          dataSource={items}
          loading={loading}
          size="middle"
          scroll={{ x: 1020 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={error ? '数据暂不可用' : '没有匹配的订单'}
              />
            ),
          }}
          pagination={{
            disabled: orderExport.busy,
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
      {actions.operation && (
        <OrderActionModal
          operation={actions.operation}
          submitting={actions.submitting}
          submitError={actions.submitError}
          onSubmit={actions.submit}
          onClose={actions.close}
        />
      )}
    </>
  );
}
