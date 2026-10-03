import { useEffect, useReducer } from 'react';
import axios from 'axios';
import { ordersApi } from '../api/orders.js';
import { createOrderListState, orderListReducer } from './orderListState.js';

export default function useOrders() {
  const [state, dispatch] = useReducer(orderListReducer, undefined, createOrderListState);
  const { query } = state;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    ordersApi
      .list(query, { signal: controller.signal })
      .then((result) => {
        if (active) dispatch({ type: 'success', query, result });
      })
      .catch((error) => {
        if (active && !axios.isCancel(error)) {
          dispatch({
            type: 'failure',
            query,
            message: error.response?.data?.message || '订单查询失败，请重试',
          });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  return {
    ...state,
    changeTab: (tab) => dispatch({ type: 'tab', tab }),
    search: (values) => dispatch({ type: 'search', values }),
    resetSearch: () => dispatch({ type: 'reset' }),
    changePage: (page, pageSize) => dispatch({ type: 'page', page, pageSize }),
    refresh: () => dispatch({ type: 'refresh' }),
  };
}
