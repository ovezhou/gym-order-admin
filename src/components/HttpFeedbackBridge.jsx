import { useEffect } from 'react';
import { App } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { subscribeHttpEvents } from '../services/httpEvents.js';

export default function HttpFeedbackBridge() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(
    () =>
      subscribeHttpEvents((event) => {
        if (event.type === 'error') message.error({ content: event.message, key: 'http-error' });
        if (event.type === 'unauthorized' && location.pathname !== '/login') {
          navigate('/login', { replace: true, state: { from: location } });
        }
      }),
    [message, navigate, location],
  );

  return null;
}
