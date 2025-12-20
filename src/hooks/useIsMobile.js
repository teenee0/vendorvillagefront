import { useState, useEffect } from 'react';

/**
 * Хук для определения мобильного устройства
 * @param {number} breakpoint - Брейкпоинт для определения мобильного устройства (по умолчанию 768px)
 * @returns {boolean} - true если устройство мобильное
 */
export const useIsMobile = (breakpoint = 768) => {
  // Инициализируем с правильным значением сразу, если window доступен
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= breakpoint;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Используем matchMedia для более надежного определения
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    
    // Функция для обновления состояния
    const updateIsMobile = (e) => {
      setIsMobile(e.matches);
    };

    // Устанавливаем начальное значение
    setIsMobile(mediaQuery.matches);

    // Добавляем слушатель изменений
    // Современные браузеры поддерживают addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateIsMobile);
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(updateIsMobile);
    }

    // Очищаем слушатель при размонтировании
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateIsMobile);
      } else {
        mediaQuery.removeListener(updateIsMobile);
      }
    };
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;