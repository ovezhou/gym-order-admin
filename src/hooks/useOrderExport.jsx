import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import axios from 'axios';
import { ordersApi } from '../api/orders.js';
import { OrderExportError } from '../domain/orderExport.js';
import { prepareOrdersExport } from '../services/orderExport.js';
import { downloadCsv } from '../utils/downloadCsv.js';

export default function useOrderExport() {
  const { message, modal } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const request = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  async function exportOrders(query, selectedIds) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setReceipt(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const file = await prepareOrdersExport(
        ordersApi,
        { query: { ...query }, selectedIds: [...selectedIds] },
        { signal: controller.signal },
      );
      if (!mounted.current) return;
      downloadCsv(file);
      setReceipt({ filename: file.filename, count: file.count, scope: file.scope });
      message.success(`已发起 ${file.count} 笔订单的 CSV 下载`);
    } catch (error) {
      if (!mounted.current || axios.isCancel(error)) return;
      if (error instanceof OrderExportError) {
        if (!error.invalidOrderNumbers.length) message.warning(error.message);
        else
          modal.error({
            title: '无法导出',
            okText: '我知道了',
            content: (
              <div>
                <p>{error.message}</p>
                <p>以下订单不符合条件，本次未生成文件：</p>
                <ul className="action-order-list">
                  {error.invalidOrderNumbers.map((number) => (
                    <li key={number}>{number}</li>
                  ))}
                </ul>
              </div>
            ),
          });
      } else if (!axios.isAxiosError(error)) {
        message.error('CSV 生成或下载失败，请重试');
      }
      // HTTP errors are already reported by the interceptor.
    } finally {
      pending.current = false;
      request.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return { busy, receipt, exportOrders, clearReceipt: () => setReceipt(null) };
}
