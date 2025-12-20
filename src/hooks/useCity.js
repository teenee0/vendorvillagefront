import { useState, useEffect } from 'react';

const CITY_STORAGE_KEY = 'selectedCity';

export const useCity = () => {
  const [selectedCity, setSelectedCity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Функция для загрузки города из localStorage
  const loadCityFromStorage = () => {
    const savedCity = localStorage.getItem(CITY_STORAGE_KEY);
    if (savedCity) {
      try {
        return JSON.parse(savedCity);
      } catch (e) {
        console.error('Ошибка парсинга сохраненного города:', e);
        localStorage.removeItem(CITY_STORAGE_KEY);
        return null;
      }
    }
    return null;
  };

  // Загрузка города из localStorage при монтировании
  useEffect(() => {
    const city = loadCityFromStorage();
    setSelectedCity(city);
    setIsLoading(false);
  }, []);

  // Отслеживание изменений в localStorage (если данные удалены вручную)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === CITY_STORAGE_KEY || e.key === null) {
        const city = loadCityFromStorage();
        setSelectedCity(city);
      }
    };

    // Слушаем события изменения localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Также проверяем периодически (на случай, если данные удалены в той же вкладке)
    const interval = setInterval(() => {
      const city = loadCityFromStorage();
      if (!city && selectedCity) {
        // Если в localStorage нет города, но в состоянии есть - обновляем
        setSelectedCity(null);
      } else if (city && (!selectedCity || city.id !== selectedCity.id)) {
        // Если в localStorage есть город, но в состоянии нет или он другой - обновляем
        setSelectedCity(city);
      }
    }, 1000); // Проверяем каждую секунду

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedCity]);

  // Сохранение города в localStorage при изменении
  const updateCity = (city) => {
    setSelectedCity(city);
    if (city) {
      localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
    } else {
      localStorage.removeItem(CITY_STORAGE_KEY);
    }
  };

  return {
    selectedCity,
    setSelectedCity: updateCity,
    isLoading
  };
};

