import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";

const PrivateRoute = () => {
  const [authStatus, setAuthStatus] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        try {
          console.log('Попытка обновить токен...');
          const response = await axios.post('accounts/api/token/refresh/', {
            withCredentials: true, // чтобы куки отправлялись
          });
          
          if (response.status === 200) {
            console.log('Токен обновлен');
          }
        } catch (error) {
          // Логируем ошибку, но не останавливаем рендер
          console.error('Ошибка при обновлении токена:', error);
        }
        const response = await axios.get('accounts/api/auth/me/', {
          withCredentials: true
        });
        
        if (response.data.authenticated) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch (error) {
        setAuthStatus('unauthenticated');
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (authStatus === 'checking') {
    return <div className="auth-loader">Проверка авторизации...</div>;
  }

  return authStatus === 'authenticated' 
    ? <Outlet /> 
    : <Navigate to="/registration-login" state={{ from: location }} replace />;
};

export default PrivateRoute;