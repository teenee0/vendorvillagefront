import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";

const PublicRoute = () => {
  useEffect(() => {
    const refreshToken = async () => {
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
    };

    refreshToken();
  }, []); // Пустой массив зависимостей, чтобы вызвать только один раз при монтировании компонента

  return <Outlet />
  
};

export default PublicRoute;
