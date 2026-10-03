import { useAuthStore } from '../stores/authStore.js';
import { installMockApi } from '../mocks/installMockApi.js';
import { createHttpClient } from './createHttpClient.js';
import { emitHttpEvent } from './httpEvents.js';

export const http = createHttpClient({
  baseURL: import.meta.env?.VITE_API_BASE_URL || '/api',
  getToken: () => useAuthStore.getState().token,
  notifyError: (message) => emitHttpEvent({ type: 'error', message }),
  onUnauthorized: () => {
    try {
      useAuthStore.getState().logout();
    } finally {
      emitHttpEvent({ type: 'unauthorized' });
    }
  },
});

// This exam uses mock APIs in both development and the production preview.
const { mock } = installMockApi(http);
if (import.meta.hot) import.meta.hot.dispose(() => mock.restore());
