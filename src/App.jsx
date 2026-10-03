import { Card, ConfigProvider, Space, Tag, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#16704a', borderRadius: 10 } }}>
      <main className="welcome">
        <Typography.Text className="welcome-eyebrow">会员服务 · 订单管理</Typography.Text>
        <Typography.Title level={1}>健身房会员办卡订单管理</Typography.Title>
        <Typography.Paragraph type="secondary">会员办卡与订单跟进管理后台</Typography.Paragraph>
        <Card title="项目初始化">
          <Typography.Paragraph>
            开发环境已建立。下一阶段将接入登录页、后台布局和受保护的订单路由。
          </Typography.Paragraph>
          <Space wrap>
            <Tag color="green">React 18</Tag>
            <Tag color="blue">React Router 7</Tag>
            <Tag color="purple">Ant Design 5</Tag>
            <Tag>JavaScript</Tag>
          </Space>
        </Card>
      </main>
    </ConfigProvider>
  );
}
