// Конфигурация окружения
const config = {
  development: {
    API_BASE_URL: 'http://127.0.0.1:8000',
    MEDIA_BASE_URL: 'http://127.0.0.1:8000',
    APP_NAME: 'Axione Dev',
    DEBUG: true,
    LOG_LEVEL: 'debug'
  },
  production: {
    // Для production берем значения из .env.production файла
    // Если переменные не заданы, используем значения по умолчанию
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.vendorvillage.store',
    MEDIA_BASE_URL: import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://api.vendorvillage.store', 
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Axione',
    DEBUG: import.meta.env.VITE_DEBUG === 'true' || false,
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'error'
  }
};

// Определяем текущее окружение
const getEnvironment = () => {
  // Проверяем переменные окружения Vite
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV;
  }
  
  // Проверяем режим Vite
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  if (import.meta.env.PROD) {
    return 'production';
  }
  
  // По умолчанию development
  return 'development';
};

const currentEnv = getEnvironment();
const currentConfig = config[currentEnv];

// Экспортируем конфигурацию
export const ENV_CONFIG = {
  ...currentConfig,
  ENVIRONMENT: currentEnv,
  IS_DEVELOPMENT: currentEnv === 'development',
  IS_PRODUCTION: currentEnv === 'production'
};

// Утилиты для логирования
export const logger = {
  debug: (...args) => {
    if (ENV_CONFIG.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args) => {
    console.info('[INFO]', ...args);
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

export default ENV_CONFIG;
