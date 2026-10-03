import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Spin } from 'antd';
import RequireAuth from './RequireAuth';
import AdminLayout from '../layouts/AdminLayout';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const OrdersPage = lazy(() => import('../pages/OrdersPage'));
const NewOrderPage = lazy(() => import('../pages/NewOrderPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page-loading">
          <Spin tip="加载页面中">
            <div />
          </Spin>
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<NewOrderPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
