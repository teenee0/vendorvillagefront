import React, { createContext, useContext, useState, useEffect } from 'react';

const SnowfallContext = createContext();

export const useSnowfall = () => {
  const context = useContext(SnowfallContext);
  if (!context) {
    throw new Error('useSnowfall must be used within a SnowfallProvider');
  }
  return context;
};

// Функция для проверки, находится ли текущая дата в периоде снега (за 2 недели до и после Нового года)
const isInSnowPeriod = () => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11, где 11 = декабрь, 0 = январь
  const currentDate = now.getDate();
  
  // Если мы в декабре (месяц 11) и дата >= 18
  if (currentMonth === 11 && currentDate >= 18) {
    return true;
  }
  
  // Если мы в январе (месяц 0) и дата <= 14
  if (currentMonth === 0 && currentDate <= 14) {
    return true;
  }
  
  return false;
};

export const SnowfallProvider = ({ children }) => {
  // Проверяем, находится ли текущая дата в периоде снега
  const isPeriodActive = isInSnowPeriod();

  // Получаем сохраненное состояние из localStorage или определяем автоматически
  const getInitialSnowfall = () => {
    // Если период не активен, снег должен быть выключен
    if (!isPeriodActive) {
      // Очищаем настройки пользователя после окончания периода
      localStorage.removeItem('snowfallEnabled');
      return false;
    }

    const savedSnowfall = localStorage.getItem('snowfallEnabled');
    
    // Если пользователь вручную установил значение, используем его (только в период)
    if (savedSnowfall !== null) {
      return savedSnowfall === 'true';
    }
    
    // Иначе определяем автоматически на основе периода
    return isPeriodActive;
  };

  const [snowfallEnabled, setSnowfallEnabled] = useState(getInitialSnowfall);
  const [isAutoMode, setIsAutoMode] = useState(() => {
    // Если период не активен, всегда автоматический режим (снег выключен)
    if (!isPeriodActive) {
      return true;
    }
    // Если пользователь не устанавливал значение вручную, значит режим автоматический
    return localStorage.getItem('snowfallEnabled') === null;
  });

  // Обновляем состояние снега при изменении периода
  useEffect(() => {
    const checkPeriod = () => {
      const shouldBeActive = isInSnowPeriod();
      
      // Если период не активен, выключаем снег и очищаем настройки
      if (!shouldBeActive) {
        setSnowfallEnabled(false);
        setIsAutoMode(true);
        localStorage.removeItem('snowfallEnabled');
        return;
      }

      // Если период активен, но ручной режим - не меняем состояние
      if (!isAutoMode) {
        return;
      }

      // В автоматическом режиме включаем/выключаем снег в зависимости от периода
      setSnowfallEnabled(shouldBeActive);
    };

    // Проверяем при монтировании
    checkPeriod();

    // Проверяем каждый день в полночь
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    let intervalId = null;
    
    const timeoutId = setTimeout(() => {
      checkPeriod();
      // Устанавливаем ежедневную проверку
      intervalId = setInterval(() => {
        checkPeriod();
      }, 24 * 60 * 60 * 1000); // 24 часа
    }, msUntilMidnight);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoMode]);

  const toggleSnowfall = () => {
    // Не позволяем переключать, если период не активен (проверяем текущее состояние)
    const currentPeriodActive = isInSnowPeriod();
    if (!currentPeriodActive) {
      return;
    }

    setSnowfallEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('snowfallEnabled', newValue.toString());
      setIsAutoMode(false); // Переключаемся на ручной режим
      return newValue;
    });
  };


  const value = {
    snowfallEnabled: isPeriodActive ? snowfallEnabled : false, // Всегда false вне периода
    toggleSnowfall,
    isAutoMode,
    isPeriodActive, // Флаг активности периода (для скрытия переключателя)
  };

  return (
    <SnowfallContext.Provider value={value}>
      {children}
    </SnowfallContext.Provider>
  );
};

