import { App, Button, Card, Form, Input, Typography } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const from = location.state?.from;
  // Only allow the known internal protected routes as return destinations.
  const destination = ['/orders', '/orders/new'].includes(from?.pathname)
    ? `${from.pathname}${from.search || ''}${from.hash || ''}`
    : '/orders';

  if (token) return <Navigate to={destination} replace />;

  function handleLogin({ username }) {
    try {
      login(username);
      message.success('登录成功');
      navigate(destination, { replace: true });
    } catch {
      message.error('登录未完成，请检查浏览器是否允许使用本地存储');
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-wordmark">
          <span className="brand-mark">G</span>健身房会员管理
        </div>
        <Typography.Title>
          每一张会员卡，
          <br />
          都跟进到位。
        </Typography.Title>
        <p>从办卡申请到会员续卡，在一个工作台中管理订单。</p>
        <div className="login-flow">
          待审核<span>→</span>待制卡<span>→</span>待寄卡<span>→</span>已完成
        </div>
      </section>
      <section className="login-panel">
        <Card className="login-card" bordered={false}>
          <Typography.Title level={2}>登录管理后台</Typography.Title>
          <Typography.Paragraph type="secondary">
            模拟登录：填写任意非空账号和密码即可进入。
          </Typography.Paragraph>
          <Form layout="vertical" name="login" onFinish={handleLogin} requiredMark={false}>
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, whitespace: true, message: '请输入账号' }]}
            >
              <Input autoComplete="username" placeholder="请输入账号" size="large" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, whitespace: true, message: '请输入密码' }]}
            >
              <Input.Password
                autoComplete="current-password"
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              登录
            </Button>
          </Form>
          <Typography.Paragraph className="login-note" type="secondary">
            演示环境 · 请使用测试信息
          </Typography.Paragraph>
        </Card>
      </section>
    </main>
  );
}
