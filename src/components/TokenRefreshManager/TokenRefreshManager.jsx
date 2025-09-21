import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from '../../api/axiosDefault';
import { devLog, devWarn } from '../../utils/devUtils';

const TokenRefreshManager = () => {
  const { isAuthenticated, refreshToken } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Обновляем токен каждые 15 минут (900000 мс)
      // Access токен живет 20 минут, поэтому обновляем за 5 минут до истечения
      intervalRef.current = setInterval(async () => {
        try {
          devLog('Автоматическое обновление токена...');
          await refreshToken();
        } catch (error) {
          devWarn('Ошибка автоматического обновления токена:', error);
        }
      }, 15 * 60 * 1000); // 15 минут
    } else {
      // Очищаем интервал если пользователь не аутентифицирован
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Очистка при размонтировании компонента
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, refreshToken]);

  // Дополнительная проверка при фокусе окна
  useEffect(() => {
    const handleFocus = async () => {
      if (isAuthenticated) {
        try {
          // Проверяем, не истек ли токен при возвращении на вкладку
          await axios.get('accounts/api/auth/me/', { withCredentials: true });
        } catch (error) {
          if (error.response?.status === 401) {
            devLog('Токен истек, пытаемся обновить...');
            await refreshToken();
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, refreshToken]);

  return null; // Этот компонент не рендерит ничего
};

export default TokenRefreshManager;
