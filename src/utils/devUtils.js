/**
 * Утилиты для режима разработки
 */

/**
 * Проверяет, находится ли приложение в режиме разработки
 * @returns {boolean} true если в режиме разработки
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Проверяет, находится ли приложение в продакшн режиме
 * @returns {boolean} true если в продакшн режиме
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Выполняет функцию только в режиме разработки
 * @param {Function} fn - Функция для выполнения
 * @param {*} fallback - Значение по умолчанию если не в режиме разработки
 * @returns {*} Результат функции или fallback
 */
export const devOnly = (fn, fallback = null) => {
  return isDevelopment() ? fn() : fallback;
};

/**
 * Логирует сообщение только в режиме разработки
 * @param {...any} args - Аргументы для console.log
 */
export const devLog = (...args) => {
  if (isDevelopment()) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Логирует предупреждение только в режиме разработки
 * @param {...any} args - Аргументы для console.warn
 */
export const devWarn = (...args) => {
  if (isDevelopment()) {
    console.warn('[DEV WARNING]', ...args);
  }
};

/**
 * Логирует ошибку только в режиме разработки
 * @param {...any} args - Аргументы для console.error
 */
export const devError = (...args) => {
  if (isDevelopment()) {
    console.error('[DEV ERROR]', ...args);
  }
};
