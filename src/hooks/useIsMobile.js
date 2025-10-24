import { useState, useEffect } from 'react';

/**
 * Хук для определения мобильного устройства
 * @param {number} breakpoint - Брейкпоинт для определения мобильного устройства (по умолчанию 768px)
 * @returns {boolean} - true если устройство мобильное
 */
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileDevice = window.innerWidth <= breakpoint;
      setIsMobile(isMobileDevice);
    };

    // Проверяем при монтировании
    checkIsMobile();

    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', checkIsMobile);

    // Очищаем слушатель при размонтировании
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;