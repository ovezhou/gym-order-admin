import { Button, Card, Empty } from 'antd';
import { useNavigate } from 'react-router';

export default function OrdersPage() {
  const navigate = useNavigate();
  return (
    <Card>
      <Empty description="订单列表将在接入模拟接口后显示">
        <Button type="primary" onClick={() => navigate('/orders/new')}>
          新建订单
        </Button>
      </Empty>
    </Card>
  );
}
