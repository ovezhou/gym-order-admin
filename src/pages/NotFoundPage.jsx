import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export default function NotFoundPage() {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  return (
    <main className="not-found-page">
      <Result
        status="404"
        title="404"
        subTitle="访问的页面不存在，请检查地址。"
        extra={
          <Button type="primary" onClick={() => navigate(token ? '/orders' : '/login')}>
            {token ? '返回订单列表' : '返回登录页'}
          </Button>
        }
      />
    </main>
  );
}
