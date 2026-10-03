import { App, Avatar, Breadcrumb, Button, Layout, Menu, Space, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import BrandMark from '../components/BrandMark.jsx';
import { useAuthStore } from '../stores/authStore';

const menuItems = [
  { key: '/orders', label: <Link to="/orders">订单列表</Link> },
  { key: '/orders/new', label: <Link to="/orders/new">新建订单</Link> },
];

export default function AdminLayout() {
  const username = useAuthStore((state) => state.username);
  const logout = useAuthStore((state) => state.logout);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isNewOrder = pathname === '/orders/new';
  const title = isNewOrder ? '新建订单' : '订单列表';
  const breadcrumbs = [
    { title: '会员管理' },
    ...(isNewOrder ? [{ title: <Link to="/orders">订单列表</Link> }] : []),
    { title },
  ];

  function handleLogout() {
    try {
      logout();
      message.success('已退出登录');
    } catch {
      message.error('已退出当前登录，但浏览器无法清理保存的信息，请检查浏览器存储权限');
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <Layout className="admin-layout">
      <Layout.Sider width={220} breakpoint="lg" collapsedWidth={0} className="admin-sidebar">
        <div className="brand">
          <BrandMark />
          <div>
            健身房管理<span>会员办卡 · 订单中心</span>
          </div>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[pathname]} items={menuItems} />
        <div className="sidebar-caption">会员服务管理后台</div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="admin-header">
          <Typography.Text className="header-title">订单管理中心</Typography.Text>
          <Space size="middle">
            <Space>
              <Avatar size="small" style={{ backgroundColor: '#16704a' }}>
                {username?.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="header-username" title={username}>
                {username}
              </span>
            </Space>
            <Button onClick={handleLogout}>退出登录</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="admin-content">
          <Breadcrumb items={breadcrumbs} />
          <Typography.Title level={2} className="page-title">
            {title}
          </Typography.Title>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
