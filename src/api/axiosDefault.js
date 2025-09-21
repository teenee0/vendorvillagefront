// src/api/axios.js
import axios_base from 'axios';
import { ENV_CONFIG, logger } from '../config/environment';

// Используем конфигурацию из environment
const API_URL = ENV_CONFIG.API_BASE_URL;

logger.debug('API Base URL:', API_URL);

const axios = axios_base.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

// Флаг для предотвращения множественных запросов обновления токена
let isRefreshing = false;
let failedQueue = [];

// Очередь для обработки запросов во время обновления токена
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// CSRF для Django (если используешь куки)
function getCookie(name) {
  const m = document.cookie.match('(?:^|; )' + name.replace(/([$?*|{}\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)');
  return m ? decodeURIComponent(m[1]) : null;
}

// Интерцептор запросов
axios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCookie('csrftoken');
    if (csrf) config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

// Интерцептор ответов для автоматического обновления токенов
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не запрос обновления токена
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Если уже идет обновление токена, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Пытаемся обновить токен
        const refreshResponse = await axios.post('accounts/api/token/refresh/', {}, {
          withCredentials: true
        });

        if (refreshResponse.status === 200) {
          // Успешно обновили токен, обрабатываем очередь
          processQueue(null, refreshResponse.data);
          
          // Повторяем оригинальный запрос
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Не удалось обновить токен
        processQueue(refreshError, null);
        
        // Перенаправляем на страницу логина
        if (window.location.pathname !== '/registration-login') {
          window.location.href = '/registration-login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
