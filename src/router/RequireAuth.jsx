import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export default function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
