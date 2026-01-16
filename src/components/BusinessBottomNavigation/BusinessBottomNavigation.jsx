import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import styles from './BusinessBottomNavigation.module.css';

const BusinessBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Достаём `business_slug` из URL
  const business_slug = location.pathname.split('/')[2];
  
  // Состояние для бизнеса
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Загружаем информацию о бизнесе
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const response = await axios.get(`/api/business/${business_slug}/settings/`);
        setBusinessInfo(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке данных бизнеса:', err);
      } finally {
        setLoading(false);
      }
    };

    if (business_slug) {
      fetchBusinessInfo();
    }
  }, [business_slug]);

  // Функция для генерации элементов навигации
  const getNavigationItems = () => {
    if (!businessInfo || loading) {
      // Если данные еще не загружены, возвращаем базовый набор
      return [
        {
          path: `/business/${business_slug}/main`,
          icon: 'fas fa-home',
          label: 'Главная'
        },
        {
          path: `/business/${business_slug}/products`,
          icon: 'fas fa-box',
          label: 'Товары'
        },
        {
          path: `/business/${business_slug}/settings`,
          icon: 'fas fa-cog',
          label: 'Настройки'
        }
      ];
    }

    const businessTypeName = businessInfo?.business_type_name || '';
    const importType = businessInfo?.import_type || 'accounting_system';

    // Если тип бизнеса - Рестораны
    if (businessTypeName === 'Рестораны') {
      return [
        {
          path: `/business/${business_slug}/main`,
          icon: 'fas fa-home',
          label: 'Главная'
        },
        {
          path: `/business/${business_slug}/products`,
          icon: 'fas fa-utensils',
          label: 'Меню'
        },
        {
          path: `/business/${business_slug}/sale-products`,
          icon: 'fas fa-shopping-cart',
          label: 'Заказы'
        },
        {
          path: `/business/${business_slug}/transactions`,
          icon: 'fas fa-receipt',
          label: 'Транзакции'
        },
        {
          path: `/business/${business_slug}/tasks`,
          icon: 'fas fa-tasks',
          label: 'Задачи'
        },
        {
          path: `/business/${business_slug}/settings`,
          icon: 'fas fa-cog',
          label: 'Настройки'
        }
      ];
    }

    // Для товарного бизнеса (Маркетплейс и другие)
    // Если используется учетная система (accounting_system)
    if (importType === 'accounting_system') {
      return [
        {
          path: `/business/${business_slug}/main`,
          icon: 'fas fa-home',
          label: 'Главная'
        },
        {
          path: `/business/${business_slug}/products`,
          icon: 'fas fa-box',
          label: 'Товары'
        },
        {
          path: `/business/${business_slug}/batches`,
          icon: 'fas fa-layer-group',
          label: 'Партии'
        },
        {
          path: `/business/${business_slug}/sale-products`,
          icon: 'fas fa-cash-register',
          label: 'Продажа'
        },
        {
          path: `/business/${business_slug}/transactions`,
          icon: 'fas fa-receipt',
          label: 'Транзакции'
        },
        {
          path: `/business/${business_slug}/tasks`,
          icon: 'fas fa-tasks',
          label: 'Задачи'
        },
        {
          path: `/business/${business_slug}/inventory`,
          icon: 'fas fa-clipboard-list',
          label: 'Инвентаризация'
        },
        {
          path: `/business/${business_slug}/settings`,
          icon: 'fas fa-cog',
          label: 'Настройки'
        }
      ];
    }

    // Если используется своя система (own_system)
    return [
      {
        path: `/business/${business_slug}/main`,
        icon: 'fas fa-home',
        label: 'Главная'
      },
      {
        path: `/business/${business_slug}/products`,
        icon: 'fas fa-box',
        label: 'Товары'
      },
      {
        path: `/business/${business_slug}/batches`,
        icon: 'fas fa-layer-group',
        label: 'Партии'
      },
      {
        path: `/business/${business_slug}/settings`,
        icon: 'fas fa-cog',
        label: 'Настройки'
      }
    ];
  };

  const navItems = getNavigationItems();

  const isActive = (path) => {
    // Для главной страницы проверяем точное совпадение или если это корень бизнеса
    if (path.includes('/main')) {
      return location.pathname === path || 
             location.pathname === `/business/${business_slug}` ||
             location.pathname === `/business/${business_slug}/`;
    }
    // Для остальных страниц проверяем начало пути
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleItemClick = (item) => {
    navigate(item.path);
  };

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => handleItemClick(item)}
          className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
        >
          <i className={item.icon}></i>
          <span className={styles.navLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BusinessBottomNavigation;

