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

// Список публичных эндпоинтов, где 401 - это нормальная ошибка (не требует обновления токена)
const publicEndpoints = [
  'accounts/api/auth/login/',
  'accounts/api/auth/register/',
  'accounts/api/auth/verify-email/',
  'accounts/api/auth/password-reset/',
  'accounts/api/auth/password-reset-confirm/',
  'accounts/api/auth/resend-code/',
  'accounts/api/auth/google/',
  'accounts/api/auth/telegram/',
  'accounts/api/token/refresh/', // Сам эндпоинт обновления токена тоже нужно исключить
];

// Функция для проверки, является ли URL публичным эндпоинтом
const isPublicEndpoint = (url) => {
  if (!url) return false;
  return publicEndpoints.some(endpoint => url.includes(endpoint));
};

// Интерцептор ответов для автоматического обновления токенов
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не запрос обновления токена или публичный эндпоинт
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint(originalRequest.url)) {
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
        
        // Список публичных страниц, на которые не нужно редиректить
        const publicPages = [
          '/registration-login',
          '/password-reset',
          '/privacy',
          '/',
          '/marketplace',
          '/business-categories',
          '/invite'
        ];
        
        const currentPath = window.location.pathname;
        const isPublicPage = publicPages.some(page => 
          currentPath === page || currentPath.startsWith(page + '/')
        );
        
        // Перенаправляем на страницу логина только если это не публичная страница
        if (!isPublicPage) {
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
