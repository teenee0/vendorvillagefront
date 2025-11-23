import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import './BusinessFooter.css';
import Dock from '../Dock/Dock';
import MobileDock from '../MobileDock/MobileDock';
import { useIsMobile } from '../../hooks/useIsMobile';

export const BusinessFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Достаём `business_slug` из URL (например, "/business/myshop/main" → "myshop")
  const business_slug = location.pathname.split('/')[2];
  
  // Состояние для локаций
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Загружаем локации при монтировании компонента
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке локаций:', err);
      } finally {
        setLoading(false);
      }
    };

    if (business_slug) {
      fetchLocations();
    }
  }, [business_slug]);
  
  // Получаем название локации из API или используем дефолтное значение
  const getLocationName = () => {
    // Получаем ID выбранной локации из localStorage
    const selectedLocationId = localStorage.getItem(`business_${business_slug}_location`);
    
    if (selectedLocationId === 'all') {
      return 'По всем точкам';
    }
    
    if (selectedLocationId && locations.length > 0) {
      const location = locations.find(loc => loc.id === parseInt(selectedLocationId));
      if (location) {
        return location.name;
      }
    }
    
    // Если локация не найдена, используем дефолтное название
    const pathParts = location.pathname.split('/');
    
    // Если есть локация в URL (например, /business/myshop/location/warehouse)
    if (pathParts[3] === 'location' && pathParts[4]) {
      return pathParts[4]; // warehouse
    }
    
    // Если мы на главной странице бизнеса
    if (pathParts[3] === 'main' || pathParts.length === 3) {
      return 'Главная локация';
    }
    
    // Для других страниц используем название страницы
    const pageName = pathParts[3];
    const pageNames = {
      'products': 'Склад товаров',
      'batches': 'Партии',
      'sale-products': 'Точка продаж',
      'transactions': 'Касса',
      'settings': 'Настройки'
    };
    
    return pageNames[pageName] || 'Текущая локация';
  };

  const handleNavigate = (path) => {
    navigate(`/business/${business_slug}${path}`);
  };

  // Обработчик клика по локации для перехода к выбору локации
  const handleLocationClick = () => {
    navigate(`/business/${business_slug}/location-select`);
  };

  const items = [
    { icon: <div>🏠</div>, label: 'Главная', onClick: () => handleNavigate('/main') },
    { icon: <div>📦</div>, label: 'Товары', onClick: () => handleNavigate('/products') },
    { icon: <div>📋</div>, label: 'Партии', onClick: () => handleNavigate('/batches') },
    { icon: <div>💳</div>, label: 'Продажа', onClick: () => handleNavigate('/sale-products') },
    { icon: <div>🧾</div>, label: 'Транзакции', onClick: () => handleNavigate('/transactions') },
    { icon: <div>✅</div>, label: 'Задачи', onClick: () => handleNavigate('/tasks') },
    { icon: <div>📊</div>, label: 'Инвентаризация', onClick: () => handleNavigate('/inventory') },
    { icon: <div>⚙️</div>, label: 'Настройки', onClick: () => handleNavigate('/settings') },
  ];

  // Выбираем компонент в зависимости от устройства
  if (isMobile) {
    return (
      <MobileDock 
        items={items}
        topBoxText={`📍 ${getLocationName()}\nНажмите чтобы выбрать локацию`}
        onLocationClick={handleLocationClick}
        panelHeight={68}
        baseItemSize={50}
        magnification={70}
      />
    );
  }

  return (
    <Dock 
      items={items}
      panelHeight={68}
      baseItemSize={50}
      magnification={70}
    />
  );
};

export default BusinessFooter;
