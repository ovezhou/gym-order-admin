import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { ordersApi } from '../api/orders.js';
import { ORDER_ACTION_RULES } from '../domain/orderActions.js';
import {
  OrderActionError,
  prepareOrderAction,
  submitOrderAction,
} from '../services/orderActions.js';

export default function useOrderActions(onSuccess) {
  const { message, modal } = App.useApp();
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operation, setOperation] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const lookupController = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      lookupController.current?.abort();
    };
  }, []);

  async function prepare(type, ids) {
    if (pending.current || operation) return;
    if (!ids.length) {
      message.warning('请至少选择一笔订单');
      return;
    }
    pending.current = true;
    setPreparing(true);
    const controller = new AbortController();
    lookupController.current = controller;
    try {
      const next = await prepareOrderAction(ordersApi, type, ids, { signal: controller.signal });
      if (mounted.current) {
        setSubmitError(null);
        setOperation(next);
      }
    } catch (error) {
      if (mounted.current && error instanceof OrderActionError) {
        modal.error({
          title: `无法${ORDER_ACTION_RULES[type].label}`,
          okText: '我知道了',
          content: (
            <div>
              <p>{error.message}</p>
              <p>以下订单不符合条件，本批次未执行：</p>
              <ul className="action-order-list">
                {error.invalidOrderNumbers.map((number) => (
                  <li key={number}>{number}</li>
                ))}
              </ul>
            </div>
          ),
        });
      }
      // HTTP errors are reported by the response interceptor.
    } finally {
      pending.current = false;
      lookupController.current = null;
      if (mounted.current) setPreparing(false);
    }
  }

  async function submit(years) {
    if (pending.current || !operation) return;
    pending.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitOrderAction(ordersApi, operation, years);
      if (!mounted.current) return;
      message.success(
        `${result.items.length} 笔订单${ORDER_ACTION_RULES[operation.type].label}成功`,
      );
      setOperation(null);
      onSuccess(result.items);
    } catch (error) {
      if (mounted.current) {
        setSubmitError(error.response?.data?.message || error.message || '操作失败，请重试');
      }
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  function close() {
    if (pending.current) return;
    setOperation(null);
    setSubmitError(null);
  }

  return {
    preparing,
    submitting,
    operation,
    submitError,
    prepare,
    submit,
    close,
    busy: preparing || submitting,
  };
}
