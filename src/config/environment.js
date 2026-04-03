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
/** Таймаут запроса «Заполнить с ИИ» (мс): дольше обычного API из‑за vision-модели. */
const AI_VISION_SUGGEST_TIMEOUT_MS = Number(import.meta.env.VITE_AI_VISION_SUGGEST_TIMEOUT_MS) || 320000;

/** Лимиты матрицы вариантов (синхронно с Django PRODUCT_ADD_*). */
const PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR =
  Number(import.meta.env.VITE_PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR) || 10;
const PRODUCT_ADD_MAX_VARIANTS_CARTESIAN_CAP =
  Number(import.meta.env.VITE_PRODUCT_ADD_MAX_VARIANTS_CARTESIAN_CAP) || 500;

/** Макс. число вариантов в режиме «все at_right из справочника» (на UI не больше обоих лимитов). */
const PRODUCT_ADD_MAX_VARIANTS_MATRIX = Math.min(
  PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR,
  PRODUCT_ADD_MAX_VARIANTS_CARTESIAN_CAP
);

export const ENV_CONFIG = {
  ...currentConfig,
  ENVIRONMENT: currentEnv,
  IS_DEVELOPMENT: currentEnv === 'development',
  IS_PRODUCTION: currentEnv === 'production',
  AI_VISION_SUGGEST_TIMEOUT_MS,
  PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR,
  PRODUCT_ADD_MAX_VARIANTS_CARTESIAN_CAP,
  PRODUCT_ADD_MAX_VARIANTS_MATRIX,
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
