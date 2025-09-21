import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="auth-loader">Проверка авторизации...</div>;
  }

  return isAuthenticated 
    ? <Outlet /> 
    : <Navigate to="/registration-login" state={{ from: location }} replace />;
};

export default PrivateRoute;