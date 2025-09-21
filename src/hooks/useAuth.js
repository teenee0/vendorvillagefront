import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axiosDefault';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Проверка аутентификации
  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get('accounts/api/auth/me/', {
        withCredentials: true
      });
      
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  }, []);

  // Обновление токена
  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post('accounts/api/token/refresh/', {}, {
        withCredentials: true
      });
      
      if (response.status === 200) {
        console.log('Токен успешно обновлен');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      // Если refresh токен недействителен, очищаем состояние
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
      }
      return false;
    }
  }, []);

  // Выход из системы
  const logout = useCallback(async () => {
    try {
      await axios.post('accounts/api/auth/logout/', {}, { 
        withCredentials: true 
      });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/registration-login';
    }
  }, []);

  // Инициализация при загрузке
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    user,
    checkAuth,
    refreshToken,
    logout
  };
};

export { useAuth };
