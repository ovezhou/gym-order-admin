import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { BrowserRouter } from 'react-router';
import AppRoutes from './router/AppRoutes';
import HttpFeedbackBridge from './components/HttpFeedbackBridge';
import './App.css';

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#16704a', borderRadius: 10 } }}>
      <AntdApp>
        <BrowserRouter>
          <HttpFeedbackBridge />
          <AppRoutes />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
