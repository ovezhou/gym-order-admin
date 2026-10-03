import { http } from '../services/http.js';

export function createOrdersApi(client) {
  return {
    list: (params = {}, { signal } = {}) => client.get('/orders', { params, signal }),
    all: (params = {}, { signal } = {}) => client.get('/orders/all', { params, signal }),
    lookup: (ids, { signal } = {}) => client.post('/orders/lookup', { ids }, { signal }),
    create: (values) => client.post('/orders', values),
    renew: (ids, years) => client.post('/orders/renew', { ids, years }),
    cancel: (ids) => client.post('/orders/cancel', { ids }),
  };
}

export const ordersApi = createOrdersApi(http);
