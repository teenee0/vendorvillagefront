import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import CitySelectModal from '../CitySelectModal/CitySelectModal';
import { useCity } from '../../hooks/useCity';

const CityRequiredWrapper = ({ children }) => {
  const location = useLocation();
  const { selectedCity, setSelectedCity, isLoading } = useCity();
  const [showModal, setShowModal] = useState(false);
  const [cities, setCities] = useState([]);
  const [userSelectedCity, setUserSelectedCity] = useState(false);

  // Список страниц, где требуется выбор города
  const marketplacePages = [
    '/',
    '/marketplace',
    '/marketplace/categories',
    '/marketplace/products',
    '/business-categories'
  ];

  const isMarketplacePage = marketplacePages.some(page => 
    location.pathname.startsWith(page)
  );

  useEffect(() => {
    const loadCities = async () => {
      try {
        // Получаем первую страну
        const countriesRes = await axios.get('api/countries/');
        if (countriesRes.data && countriesRes.data.length > 0) {
          const firstCountry = countriesRes.data[0];
          // Получаем города этой страны
          const citiesRes = await axios.get(`api/cities/?country=${firstCountry.id}`);
          setCities(citiesRes.data || []);
        }
      } catch (err) {
        console.error('Ошибка загрузки городов:', err);
      }
    };

    if (isMarketplacePage) {
      loadCities();
    }
  }, [isMarketplacePage]);

  // Показываем модальное окно и автоматически выбираем город по умолчанию
  useEffect(() => {
    if (!isLoading && isMarketplacePage && !selectedCity && cities.length > 0) {
      setShowModal(true);
      setUserSelectedCity(false);
      // Автоматически выбираем столицу или первый город
      const capital = cities.find(city => city.is_capital);
      if (capital) {
        setSelectedCity(capital);
      } else if (cities.length > 0) {
        setSelectedCity(cities[0]);
      }
    } else if (selectedCity && showModal && userSelectedCity) {
      // Закрываем модальное окно только если пользователь явно выбрал город
      setShowModal(false);
    } else if (!selectedCity && showModal && cities.length === 0) {
      // Если города загружаются, оставляем модальное окно открытым
      // (города еще загружаются)
    }
  }, [isLoading, isMarketplacePage, selectedCity, cities, setSelectedCity, showModal, userSelectedCity]);

  const handleSelectCity = (city) => {
    setUserSelectedCity(true);
    setSelectedCity(city);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    // Если пользователь закрыл модальное окно без выбора города,
    // автоматически выбираем столицу или первый город
    if (!selectedCity && cities.length > 0) {
      const capital = cities.find(city => city.is_capital);
      if (capital) {
        setSelectedCity(capital);
      } else {
        setSelectedCity(cities[0]);
      }
    }
    setShowModal(false);
  };

  // Если это не страница маркетплейса, просто показываем children
  if (!isMarketplacePage) {
    return <>{children}</>;
  }

  // Если загрузка, показываем children (модальное окно само покажется)
  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showModal && (
        <CitySelectModal
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default CityRequiredWrapper;

