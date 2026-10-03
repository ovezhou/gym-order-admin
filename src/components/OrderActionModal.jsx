import { Alert, Button, Descriptions, Form, InputNumber, Modal, Space, Typography } from 'antd';
import { calculateRenewalQuote, getRenewalYearsError } from '../domain/orderActions.js';
import { formatAmount } from '../utils/format.js';

function OrderNumbers({ orders }) {
  return (
    <ul className="action-order-list">
      {orders.map((order) => (
        <li key={order.id}>
          {order.orderNo} · {order.memberName}
        </li>
      ))}
    </ul>
  );
}

function RenewalModal({ operation, submitting, submitError, onSubmit, onClose }) {
  const [form] = Form.useForm();
  const years = Form.useWatch('years', form);
  const quote = calculateRenewalQuote(years, operation.orders.length);
  return (
    <Modal
      open
      title={`续卡 · ${operation.orders.length} 笔订单`}
      onCancel={onClose}
      maskClosable={false}
      closable={!submitting}
      keyboard={!submitting}
      footer={null}
    >
      <Typography.Paragraph>以下已到期订单将续卡，提交后进入待审核状态。</Typography.Paragraph>
      <OrderNumbers orders={operation.orders} />
      {submitError && (
        <Alert className="action-error" type="error" showIcon message={submitError} />
      )}
      <Form
        form={form}
        name="renewal"
        layout="vertical"
        disabled={submitting}
        onFinish={({ years }) => onSubmit(years)}
        validateTrigger="onBlur"
        scrollToFirstError={{ focus: true }}
      >
        <Form.Item
          label="续卡年限"
          name="years"
          required
          rules={[
            {
              validator: (_, value) => {
                const error = getRenewalYearsError(value);
                return error ? Promise.reject(new Error(error)) : Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            step={1}
            changeOnBlur={false}
            addonAfter="年"
            placeholder="请输入 1～10 的整数"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <div aria-live="polite" className="renewal-quote">
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: 'count', label: '订单数量', children: `${operation.orders.length} 笔` },
              {
                key: 'each',
                label: '每笔费用',
                children: `${formatAmount(quote?.feePerOrder)} 元`,
              },
              {
                key: 'total',
                label: '应付合计',
                children: (
                  <Typography.Text strong>{formatAmount(quote?.totalFee)} 元</Typography.Text>
                ),
              },
            ]}
          />
          <Typography.Text type="secondary">
            {quote?.discountApplied
              ? '单次续卡满 5 年，已按八折计算。'
              : '每年 1,200 元；单次续卡满 5 年享八折。'}
          </Typography.Text>
        </div>
        <div className="action-modal-footer">
          <Space>
            <Button disabled={submitting} onClick={onClose}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              确认续卡
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}

export default function OrderActionModal(props) {
  const { operation, submitting, submitError, onSubmit, onClose } = props;
  if (operation.type === 'renew') return <RenewalModal {...props} />;
  return (
    <Modal
      open
      title={`确认撤单 · ${operation.orders.length} 笔订单`}
      onCancel={onClose}
      onOk={() => onSubmit()}
      okText="确认撤单"
      cancelText="保留订单"
      okButtonProps={{ danger: true }}
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={false}
      closable={!submitting}
      keyboard={!submitting}
    >
      <Typography.Paragraph>确认将以下订单撤单？确认后订单状态变为已取消。</Typography.Paragraph>
      <OrderNumbers orders={operation.orders} />
      {submitError && <Alert type="error" showIcon message={submitError} />}
    </Modal>
  );
}
