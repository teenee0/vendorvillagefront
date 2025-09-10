import { useMemo } from 'react';
import { ENV_CONFIG, logger } from '../config/environment';

/**
 * Хук для работы с конфигурацией окружения
 * @returns {Object} Конфигурация и утилиты для текущего окружения
 */
export const useEnvironment = () => {
  const config = useMemo(() => ENV_CONFIG, []);

  const getApiUrl = (endpoint = '') => {
    const url = `${config.API_BASE_URL}${endpoint}`;
    logger.debug('API URL:', url);
    return url;
  };

  const getMediaUrl = (path = '') => {
    if (!path) return '';
    
    // Если уже полный URL, возвращаем как есть
    if (/^https?:\/\//i.test(path)) return path;
    
    const url = path.startsWith('/media/') 
      ? `${config.MEDIA_BASE_URL}${path}`
      : `${config.MEDIA_BASE_URL}/media/${path}`;
    
    logger.debug('Media URL:', url);
    return url;
  };

  const isDevelopment = config.IS_DEVELOPMENT;
  const isProduction = config.IS_PRODUCTION;

  return {
    ...config,
    getApiUrl,
    getMediaUrl,
    isDevelopment,
    isProduction,
    logger
  };
};

export default useEnvironment;
