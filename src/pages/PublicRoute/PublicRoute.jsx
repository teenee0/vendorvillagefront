import { Outlet, Navigate, useLocation } from 'react-router-dom';

const PublicRoute = () => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('access_token');
  
  // Список страниц, на которые не должны попадать авторизованные пользователи
  const authOnlyPages = ['/registration-login', '/password-reset'];
  
  // Если пользователь авторизован и пытается попасть на страницу входа/регистрации/сброса пароля
  if (isAuthenticated && authOnlyPages.includes(location.pathname)) {
    return <Navigate to="/account" replace />;
  }
  
  return <Outlet />;
};

export default PublicRoute;
