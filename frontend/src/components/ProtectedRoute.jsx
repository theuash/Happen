import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
