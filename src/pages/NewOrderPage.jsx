import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, InputNumber, Space, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { ordersApi } from '../api/orders.js';
import { calculateCardFee } from '../domain/orders.js';
import { getNewOrderErrors, normalizeNewOrder } from '../domain/newOrder.js';
import { formatAmount } from '../utils/format.js';

const fieldNames = ['memberName', 'phone', 'years', 'remark'];
function fieldRule(name) {
  return {
    validator: (_, value) => {
      const error = getNewOrderErrors({ [name]: value })[name];
      return error ? Promise.reject(new Error(error)) : Promise.resolve();
    },
  };
}

export default function NewOrderPage() {
  const [form] = Form.useForm();
  const years = Form.useWatch('years', form);
  const fee = calculateCardFee(years);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submissionPending = useRef(false);
  const mounted = useRef(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleSubmit(values) {
    if (submissionPending.current) return;
    submissionPending.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await ordersApi.create(normalizeNewOrder(values));
      if (!mounted.current) return;
      message.success(`订单 ${order.orderNo} 创建成功`);
      // The list is remounted with its default tab, search and first page.
      navigate('/orders', { replace: true });
    } catch (error) {
      if (!mounted.current) return;
      const fields = error.response?.data?.fields ?? {};
      form.setFields(
        fieldNames
          .filter((name) => fields[name])
          .map((name) => ({
            name,
            errors: [fields[name]],
          })),
      );
      setSubmitError(error.response?.data?.message || '订单提交失败，请稍后重试');
    } finally {
      submissionPending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <Card className="new-order-card" title="会员办卡申请">
      <Typography.Paragraph type="secondary">
        填写会员资料与购卡年限，提交后订单进入待审核状态。
      </Typography.Paragraph>
      {submitError && (
        <Alert
          className="new-order-error"
          type="error"
          showIcon
          message="订单提交失败"
          description={submitError}
        />
      )}
      <Form
        form={form}
        name="new-order"
        layout="vertical"
        className="new-order-form"
        disabled={submitting}
        onFinish={handleSubmit}
        scrollToFirstError={{ focus: true }}
        validateTrigger="onBlur"
      >
        <Form.Item
          label="会员姓名"
          name="memberName"
          required
          rules={[fieldRule('memberName')]}
          extra="2～30 个字符，首尾空格会自动去除。"
        >
          <Input placeholder="请输入会员姓名" autoComplete="off" />
        </Form.Item>
        <Form.Item label="联系手机号" name="phone" required rules={[fieldRule('phone')]}>
          <Input placeholder="请输入 11 位中国大陆手机号" inputMode="tel" autoComplete="off" />
        </Form.Item>
        <Form.Item label="购卡年限" name="years" required rules={[fieldRule('years')]}>
          <InputNumber
            step={1}
            changeOnBlur={false}
            placeholder="请输入 1～10 的整数"
            addonAfter="年"
            className="year-input"
          />
        </Form.Item>
        <Form.Item
          label="办卡费用"
          htmlFor="new-order-fee"
          extra="每年 1,200 元，按购卡年限自动计算。"
        >
          <Input
            id="new-order-fee"
            readOnly
            value={fee == null ? '—' : formatAmount(fee)}
            addonAfter="元"
            className="fee-input"
          />
        </Form.Item>
        <Form.Item label="备注" name="remark" rules={[fieldRule('remark')]}>
          <Input.TextArea
            placeholder="选填，最多 200 个字符"
            rows={4}
            showCount={{ formatter: ({ value }) => `${[...(value || '')].length} / 200` }}
          />
        </Form.Item>
        <div className="new-order-actions">
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交订单
            </Button>
            <Button onClick={() => navigate('/orders')}>返回列表</Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
}
