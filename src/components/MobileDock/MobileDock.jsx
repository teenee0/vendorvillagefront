import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './MobileDock.module.css';

const MobileDock = ({ 
  items = [
    { 
      icon: '🏠', 
      label: 'Главная', 
      onClick: () => {},
      isActive: true 
    },
    { 
      icon: '📦', 
      label: 'Товары', 
      onClick: () => {},
      isActive: false 
    },
    { 
      icon: '💳', 
      label: 'Продажа', 
      onClick: () => {},
      isActive: false 
    },
    { 
      icon: '🧾', 
      label: 'Транзакции', 
      onClick: () => {},
      isActive: false 
    },
    { 
      icon: '⚙️', 
      label: 'Настройки', 
      onClick: () => {},
      isActive: false 
    }
  ],
  topBoxText = "📍 По всем точкам\nВсе локации",
  onNavigate = null,
  onLocationClick = null, // Новый prop для обработки клика по локации
  // Дополнительные props для совместимости с Dock
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeRoute, setActiveRoute] = useState('/main');
  const [dockItems, setDockItems] = useState(items);

  // Обновляем dockItems при изменении items
  useEffect(() => {
    setDockItems(items);
  }, [items]);

  // Обновляем активный маршрут при изменении location
  useEffect(() => {
    const currentRoute = location.pathname;
    setActiveRoute(currentRoute);
    
    // Обновляем состояние активных элементов
    setDockItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        isActive: item.route === currentRoute || location.pathname.includes(item.route || '')
      }))
    );
  }, [location.pathname]);

  // Функция навигации
  const handleNavigate = (item) => {
    console.log(`Навигация к: ${item.label}`);
    
    // Обновляем активный маршрут
    setActiveRoute(item.route || item.label);
    
    // Обновляем состояние элементов док-панели
    setDockItems(prevItems => 
      prevItems.map(dockItem => ({
        ...dockItem,
        isActive: dockItem === item
      }))
    );
    
    // Выполняем onClick функцию элемента
    if (item.onClick) {
      item.onClick();
    }
    
    // Выполняем кастомную навигацию если есть
    if (onNavigate) {
      onNavigate(item);
    }
  };

  // Функция для обновления конфигурации док-панели
  const updateDockConfig = (newConfig) => {
    setDockItems(newConfig);
  };

  // Функция для добавления новой иконки в док
  const addDockItem = (item) => {
    setDockItems(prevItems => [...prevItems, item]);
  };

  // Функция для удаления иконки из док
  const removeDockItem = (route) => {
    setDockItems(prevItems => prevItems.filter(item => item.route !== route));
  };

  // Функция для установки активной иконки
  const setActiveDockItem = (route) => {
    setDockItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        isActive: item.route === route
      }))
    );
  };

  // Эффект клика для анимации
  const handleIconClick = (route, event) => {
    const iconElement = event.currentTarget;
    
    // Добавляем эффект клика
    iconElement.style.transform = 'translateY(-8px) scale(0.95)';
    setTimeout(() => {
      iconElement.style.transform = '';
    }, 150);
    
    handleNavigate(route);
  };

  // Обработчик клика по topBox
  const handleLocationClick = () => {
    console.log('Клик по локации - переход к выбору локации');
    
    if (onLocationClick) {
      onLocationClick();
    } else {
      // Дефолтная навигация на страницу выбора локации
      const business_slug = location.pathname.split('/')[2];
      navigate(`/business/${business_slug}/location-select`);
    }
  };

  // Функции для внешнего управления (если нужно)
  // Можно использовать через props или context

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topBox} onClick={handleLocationClick}>
          {topBoxText.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {index === 0 ? (
                <div className={styles.locationName}>{line}</div>
              ) : (
                <div className={styles.locationHint}>{line}</div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className={styles.dock}>
          {dockItems.map((item, index) => (
            <div
              key={item.route || item.label || index}
              className={`${styles.icon} ${item.isActive ? styles.active : ''}`}
              onClick={(e) => handleIconClick(item, e)}
            >
              <div className={styles.iconEmoji}>
                {typeof item.icon === 'string' ? item.icon : item.icon}
              </div>
              <div className={styles.iconLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default MobileDock;
